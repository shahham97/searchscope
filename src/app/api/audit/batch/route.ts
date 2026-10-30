import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeFetch } from '@/lib/security/safe-fetch';
import { normalizeUrl, isInternalUrl } from '@/lib/crawler/url-utils';
import { parseHtmlContent } from '@/lib/extractor/html-parser';
import { isLikelySpaShell, renderHeadlessDom } from '@/lib/extractor/headless-renderer';
import { isPathAllowed, RobotsTxtData } from '@/lib/crawler/robots';
import { classifyUrlOnly } from '@/lib/analyzer/page-classifier';
import { CrawlDiagnostic, ExtractedPageData, FailureCode, PageType } from '@/types/audit';

export const maxDuration = 25; // 25s execution budget per batch
export const dynamic = 'force-dynamic';

const BatchItemSchema = z.object({
  url: z.string().trim().min(3),
  depth: z.number().int().min(0).default(0),
  discoveredFrom: z.string().optional(),
});

const BatchSchema = z.object({
  items: z.array(BatchItemSchema).min(1).max(10), // Limit strictly to 10 URLs per batch
  canonicalOrigin: z.string(),
  canonicalHostname: z.string(),
  userAgentType: z.enum(['browser', 'bot']).optional().default('browser'),
  respectRobotsTxt: z.boolean().optional().default(true),
  enableHeadlessRendering: z.boolean().optional().default(false),
  llmsTxtPresent: z.boolean().optional().default(false),
  robotsData: z.any().optional(),
});

export interface BatchItemResult {
  url: string;
  normalizedUrl: string;
  depth: number;
  state: 'crawled_ok' | 'failed' | 'skipped_robots' | 'skipped_non_html' | 'redirected';
  statusCode: number;
  failureCode?: FailureCode;
  failureHint?: string;
  pageData?: ExtractedPageData;
  redirectTarget?: string;
  contentType?: string;
}

export interface DiscoveredLink {
  url: string;
  normalizedUrl: string;
  depth: number;
  discoveredFrom: string;
  pageType: PageType;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = BatchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: `Validation error: ${parseResult.error.issues[0]?.message}` },
        { status: 400 }
      );
    }

    const {
      items,
      canonicalOrigin,
      canonicalHostname,
      userAgentType,
      respectRobotsTxt,
      enableHeadlessRendering,
      llmsTxtPresent,
      robotsData,
    } = parseResult.data;

    const results: BatchItemResult[] = [];
    const discoveredLinks: DiscoveredLink[] = [];
    const diagnostics: CrawlDiagnostic[] = [];

    // Process items in this batch concurrently for high performance within serverless timeouts
    await Promise.all(
      items.map(async (item) => {
        const currentUrl = item.url;
        const currentDepth = item.depth;
        const normCurrent = normalizeUrl(currentUrl, canonicalOrigin) || currentUrl;

        // 1. Robots.txt check
        if (respectRobotsTxt && robotsData) {
          try {
            const parsedPath = new URL(currentUrl).pathname;
            if (!isPathAllowed(parsedPath, robotsData as RobotsTxtData, 'SearchScope-Auditor')) {
              results.push({
                url: currentUrl,
                normalizedUrl: normCurrent,
                depth: currentDepth,
                state: 'skipped_robots',
                statusCode: 0,
                failureCode: 'ROBOTS_BLOCKED',
                failureHint: 'URL disallowed by robots.txt directive',
              });
              diagnostics.push({
                url: currentUrl,
                code: 'ROBOTS_BLOCKED',
                message: 'URL disallowed by robots.txt directive',
                hint: 'Robots.txt blocks search engine crawlers from indexing this path.',
                stage: 'policy',
                timestamp: new Date().toISOString(),
              });
              return;
            }
          } catch {
            // If parse fails, proceed cautiously
          }
        }

        // 2. Fetch page
        try {
          const res = await safeFetch(currentUrl, {
            timeoutMs: 8000,
            allowedHostname: canonicalHostname,
            allowSubdomains: true,
            userAgentType,
          });

          const isHtml = res.contentType.toLowerCase().includes('text/html');

          if (!isHtml) {
            results.push({
              url: currentUrl,
              normalizedUrl: normCurrent,
              depth: currentDepth,
              state: 'skipped_non_html',
              statusCode: res.statusCode,
              failureCode: 'CONTENT_TYPE_UNSUPPORTED',
              failureHint: `Non-HTML content type: ${res.contentType}`,
              contentType: res.contentType,
            });
            diagnostics.push({
              url: currentUrl,
              code: 'CONTENT_TYPE_UNSUPPORTED',
              statusCode: res.statusCode,
              message: `Non-HTML content type: ${res.contentType}`,
              hint: 'Resource is an image, PDF, or binary feed not suitable for HTML audit.',
              stage: 'response',
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Render SPA if enabled
          let finalHtml = res.body;
          let isJsRendered = false;
          let rawVsRenderedDiff;
          let rawH1s: string[] | undefined;
          let renderedH1s: string[] | undefined;
          let isH1OnlyInJs: boolean | undefined;

          if (enableHeadlessRendering && isLikelySpaShell(res.body, 100)) {
            const renderResult = await renderHeadlessDom(res.url, res.body);
            if (renderResult.isJsRendered) {
              finalHtml = renderResult.renderedHtml;
              isJsRendered = true;
              rawVsRenderedDiff = renderResult.rawVsRenderedDiff;
              rawH1s = renderResult.rawH1s;
              renderedH1s = renderResult.renderedH1s;
              isH1OnlyInJs = renderResult.isH1OnlyInJs;
            }
          }

          const pageData = parseHtmlContent(
            res.url,
            finalHtml,
            res.headers,
            res.durationMs,
            res.statusCode,
            res.statusText
          );
          pageData.llmsTxtDetected = llmsTxtPresent;
          pageData.isJsRendered = isJsRendered;
          pageData.rawVsRenderedDiff = rawVsRenderedDiff;
          pageData.redirectChain = res.redirectChain;
          if (rawH1s) pageData.rawH1s = rawH1s;
          if (renderedH1s) pageData.renderedH1s = renderedH1s;
          if (isH1OnlyInJs !== undefined) pageData.isH1OnlyInJs = isH1OnlyInJs;

          const isRedirected =
            (pageData.normalizedUrl !== normCurrent && res.url !== currentUrl) ||
            (res.redirectChain && res.redirectChain.length > 0);

          if (res.failureCode) {
            results.push({
              url: res.url,
              normalizedUrl: pageData.normalizedUrl,
              depth: currentDepth,
              state: 'failed',
              statusCode: res.statusCode,
              failureCode: res.failureCode,
              failureHint: res.failureHint,
              pageData,
            });
            diagnostics.push({
              url: currentUrl,
              code: res.failureCode,
              statusCode: res.statusCode,
              message: `HTTP ${res.statusCode}: ${res.statusText}`,
              hint: res.failureHint || 'Request returned an error status code.',
              stage: 'response',
              timestamp: new Date().toISOString(),
            });
          } else if (isRedirected) {
            results.push({
              url: currentUrl,
              normalizedUrl: normCurrent,
              depth: currentDepth,
              state: 'redirected',
              statusCode: res.statusCode,
              redirectTarget: pageData.normalizedUrl,
              pageData,
            });
          } else {
            results.push({
              url: res.url,
              normalizedUrl: pageData.normalizedUrl,
              depth: currentDepth,
              state: 'crawled_ok',
              statusCode: res.statusCode,
              pageData,
            });
          }

          // Extract newly discovered internal links
          for (const link of pageData.internalLinks) {
            const normLink = link.url;
            if (normLink && isInternalUrl(normLink, canonicalHostname, true)) {
              discoveredLinks.push({
                url: link.url,
                normalizedUrl: normLink,
                depth: currentDepth + 1,
                discoveredFrom: currentUrl,
                pageType: classifyUrlOnly(normLink),
              });
            }
          }
        } catch (err: any) {
          const failureCode: FailureCode = err.failureCode || 'CONNECTION_REFUSED';
          const failureHint: string = err.failureHint || err.message || 'Request failed to complete';

          results.push({
            url: currentUrl,
            normalizedUrl: normCurrent,
            depth: currentDepth,
            state: 'failed',
            statusCode: err.statusCode || 0,
            failureCode,
            failureHint,
          });

          diagnostics.push({
            url: currentUrl,
            code: failureCode,
            message: err.message,
            hint: failureHint,
            stage: err.message?.includes('SSRF') ? 'policy' : err.message?.includes('DNS') ? 'dns' : 'connect',
            timestamp: new Date().toISOString(),
          });
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
      discoveredLinks,
      diagnostics,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Batch execution failed' },
      { status: 500 }
    );
  }
}
