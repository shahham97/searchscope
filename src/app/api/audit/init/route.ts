import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateTargetUrl } from '@/lib/security/ssrf';
import { fetchRobotsTxt } from '@/lib/crawler/robots';
import { discoverSitemapUrls } from '@/lib/crawler/sitemap';
import { safeFetch } from '@/lib/security/safe-fetch';
import { normalizeUrl, isInternalUrl } from '@/lib/crawler/url-utils';
import { classifyUrlOnly } from '@/lib/analyzer/page-classifier';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const InitSchema = z.object({
  url: z.string().trim().min(3).max(2048),
  maxPages: z.number().int().min(1).max(500).optional().default(100),
  userAgentType: z.enum(['browser', 'bot']).optional().default('browser'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = InitSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: `Validation error: ${parseResult.error.issues[0]?.message}` },
        { status: 400 }
      );
    }

    const { url, maxPages, userAgentType } = parseResult.data;

    // 1. SSRF and Domain Safety Check
    const validation = await validateTargetUrl(url);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        { error: validation.error || 'Target URL failed safety validation.' },
        { status: 400 }
      );
    }

    const targetNormalizedUrl = validation.normalizedUrl;
    const initialParsed = new URL(targetNormalizedUrl);
    const canonicalOrigin = initialParsed.origin;
    const canonicalHostname = initialParsed.hostname;

    // 2. Fetch robots.txt
    const robotsData = await fetchRobotsTxt(canonicalOrigin);

    // 3. Discover sitemaps
    const sitemapResult = await discoverSitemapUrls(canonicalOrigin, robotsData.sitemaps, maxPages);

    // 4. Check for llms.txt
    let llmsTxtPresent = false;
    try {
      const llmsRes = await safeFetch(`${canonicalOrigin}/llms.txt`, {
        timeoutMs: 4000,
        maxBytes: 200000,
        userAgentType,
      });
      if (llmsRes.statusCode === 200 && llmsRes.body.trim().length > 0) {
        llmsTxtPresent = true;
      }
    } catch {
      llmsTxtPresent = false;
    }

    // 5. Build seed list
    const initialSeeds: Array<{
      url: string;
      normalizedUrl: string;
      depth: number;
      discoveredFrom?: string;
      pageType: string;
    }> = [];

    const homeNorm = normalizeUrl(targetNormalizedUrl, canonicalOrigin) || targetNormalizedUrl;
    initialSeeds.push({
      url: targetNormalizedUrl,
      normalizedUrl: homeNorm,
      depth: 0,
      pageType: 'home',
    });

    const seenUrls = new Set<string>([homeNorm]);

    for (const sitemapUrl of sitemapResult.discoveredUrls) {
      const norm = normalizeUrl(sitemapUrl, canonicalOrigin);
      if (norm && isInternalUrl(norm, canonicalHostname, true) && !seenUrls.has(norm)) {
        seenUrls.add(norm);
        initialSeeds.push({
          url: sitemapUrl,
          normalizedUrl: norm,
          depth: 1,
          discoveredFrom: 'sitemap.xml',
          pageType: classifyUrlOnly(norm),
        });
      }
    }

    return NextResponse.json({
      success: true,
      canonicalOrigin,
      canonicalHostname,
      targetNormalizedUrl,
      robotsData,
      sitemapsFound: sitemapResult.sitemapsFound,
      llmsTxtPresent,
      initialSeeds,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize audit crawl' },
      { status: 500 }
    );
  }
}
