import { describe, it, expect } from 'vitest';
import { validateTargetUrl } from '../src/lib/security/ssrf';
import { fetchRobotsTxt } from '../src/lib/crawler/robots';
import { discoverSitemapUrls } from '../src/lib/crawler/sitemap';
import { normalizeUrl, isInternalUrl } from '../src/lib/crawler/url-utils';
import { classifyUrlOnly } from '../src/lib/analyzer/page-classifier';
import { safeFetch } from '../src/lib/security/safe-fetch';
import { parseHtmlContent } from '../src/lib/extractor/html-parser';
import { ResultLedger } from '../src/lib/crawler/ledger';
import { calculateAuditScores } from '../src/lib/analyzer/scoring';

describe('Simulate Full Fixed Audit Flow for stewart.com', () => {
  it('correctly audits stewart.com with redirect accounting and positive page counts', async () => {
    const rawUrl = 'stewart.com';
    const validation = await validateTargetUrl(rawUrl);
    expect(validation.isValid).toBe(true);
    const targetNormalizedUrl = validation.normalizedUrl!;

    // 1. Probe root to resolve true canonical origin and hostname
    const initialParsed = new URL(targetNormalizedUrl);
    let canonicalOrigin = initialParsed.origin;
    let canonicalHostname = initialParsed.hostname;
    let effectiveTargetUrl = targetNormalizedUrl;

    try {
      const probeRes = await safeFetch(targetNormalizedUrl, {
        timeoutMs: 6000,
        allowedHostname: canonicalHostname,
        allowSubdomains: true,
        userAgentType: 'browser',
      });
      if (probeRes.url) {
        const probedParsed = new URL(probeRes.url);
        canonicalOrigin = probedParsed.origin;
        canonicalHostname = probedParsed.hostname;
        effectiveTargetUrl = probeRes.url;
      }
    } catch {}

    expect(canonicalHostname).toBe('www.stewart.com');
    expect(canonicalOrigin).toBe('https://www.stewart.com');

    // 2. Fetch robots and sitemaps using resolved canonicalOrigin
    const robotsData = await fetchRobotsTxt(canonicalOrigin);
    const sitemapResult = await discoverSitemapUrls(canonicalOrigin, robotsData.sitemaps, 25);

    const ledger = new ResultLedger();
    const queue: Array<{ url: string; depth: number }> = [];

    const homeNorm = normalizeUrl(effectiveTargetUrl, canonicalOrigin) || effectiveTargetUrl;
    ledger.registerDiscovery(effectiveTargetUrl, homeNorm, 0, undefined, 'home');
    queue.push({ url: effectiveTargetUrl, depth: 0 });

    const visitedNormalized = new Set<string>([homeNorm]);

    for (const sitemapUrl of sitemapResult.discoveredUrls) {
      const norm = normalizeUrl(sitemapUrl, canonicalOrigin);
      if (norm && isInternalUrl(norm, canonicalHostname, true) && !visitedNormalized.has(norm)) {
        visitedNormalized.add(norm);
        ledger.registerDiscovery(sitemapUrl, norm, 1, 'sitemap.xml', classifyUrlOnly(norm));
        queue.push({ url: sitemapUrl, depth: 1 });
      }
    }

    expect(queue.length).toBeGreaterThan(1);

    // 3. Process first batch of 5 items concurrently (as fixed batch route will do)
    const batchItems = queue.slice(0, 5);
    const collectedPages: any[] = [];
    const visitedLandingUrls = new Set<string>();

    const batchResults = await Promise.all(
      batchItems.map(async (item) => {
        const currentUrl = item.url;
        const normCurrent = normalizeUrl(currentUrl, canonicalOrigin) || currentUrl;

        const res = await safeFetch(currentUrl, {
          timeoutMs: 8000,
          allowedHostname: canonicalHostname,
          allowSubdomains: true,
          userAgentType: 'browser',
        });

        const pageData = parseHtmlContent(res.url, res.body, res.headers, res.durationMs, res.statusCode, res.statusText);
        const isRedirected = (pageData.normalizedUrl !== normCurrent && res.url !== currentUrl) || (res.redirectChain && res.redirectChain.length > 0);

        return {
          url: currentUrl,
          normalizedUrl: normCurrent,
          depth: item.depth,
          state: isRedirected ? ('redirected' as const) : ('crawled_ok' as const),
          statusCode: res.statusCode,
          redirectTarget: pageData.normalizedUrl,
          pageData,
        };
      })
    );

    // Process batch results into ledger with redirect fix
    for (const res of batchResults) {
      if (res.state === 'crawled_ok' && res.pageData) {
        ledger.recordCrawledOk(res.normalizedUrl, res.pageData);
        if (!visitedLandingUrls.has(res.pageData.normalizedUrl)) {
          visitedLandingUrls.add(res.pageData.normalizedUrl);
          collectedPages.push(res.pageData);
        }
      } else if (res.state === 'redirected') {
        ledger.recordRedirected(res.url, res.normalizedUrl, res.redirectTarget || '', res.depth);
        if (res.pageData && res.redirectTarget) {
          const targetNorm = res.pageData.normalizedUrl || res.redirectTarget;
          const existing = ledger.getEntry(targetNorm);
          if (!existing || existing.state !== 'crawled_ok') {
            ledger.recordCrawledOk(targetNorm, res.pageData);
          }
          if (!visitedLandingUrls.has(targetNorm)) {
            visitedLandingUrls.add(targetNorm);
            collectedPages.push(res.pageData);
          }
        }
      }
    }

    const summary = ledger.reconcile();
    console.log('Ledger reconcile summary:', summary);
    console.log('Collected pages count:', collectedPages.length);

    expect(summary.crawledOk).toBeGreaterThan(0);
    expect(collectedPages.length).toBeGreaterThan(0);

    const successfulPages = collectedPages.filter(p => p.statusCode >= 200 && p.statusCode < 400);
    const isCrawlFailed = successfulPages.length === 0;

    expect(isCrawlFailed).toBe(false);

    const successfulPagesCount = Math.max(summary.crawledOk, successfulPages.length);
    expect(successfulPagesCount).toBeGreaterThan(0);

    console.log('Audit simulation SUCCESS for stewart.com:', {
      crawledOk: summary.crawledOk,
      redirected: summary.redirected,
      collectedPages: collectedPages.length,
      sampleTitles: collectedPages.map(p => p.title),
    });
  }, 45000);
});
