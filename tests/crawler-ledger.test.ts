import { describe, it, expect } from 'vitest';
import { ResultLedger } from '../src/lib/crawler/ledger';
import { sampleStratifiedCandidates, CrawlCandidate } from '../src/lib/crawler/stratified-sampler';
import { ExtractedPageData, PageType } from '../src/types/audit';

describe('Part A: ResultLedger & Data Integrity', () => {
  it('correctly records terminal states and satisfies Invariant 1', () => {
    const ledger = new ResultLedger();

    // 10 discovered URLs
    for (let i = 1; i <= 10; i++) {
      ledger.registerDiscovery(`https://example.com/page-${i}`, `https://example.com/page-${i}`);
    }

    // 4 succeed
    for (let i = 1; i <= 4; i++) {
      const mockPage: Partial<ExtractedPageData> = {
        url: `https://example.com/page-${i}`,
        normalizedUrl: `https://example.com/page-${i}`,
        statusCode: 200,
        isHtml: true,
        wordCount: 300,
        structuredData: [],
        internalLinks: [],
        externalLinks: [],
      };
      ledger.recordCrawledOk(`https://example.com/page-${i}`, mockPage as ExtractedPageData);
    }

    // 2 fail
    ledger.recordFailed(
      'https://example.com/page-5',
      'https://example.com/page-5',
      'HTTP_ERROR_404',
      'Not found',
      404
    );
    ledger.recordFailed(
      'https://example.com/page-6',
      'https://example.com/page-6',
      'TIMEOUT',
      'Request timed out',
      0
    );

    // 1 robots blocked
    ledger.recordSkippedRobots('https://example.com/page-7', 'https://example.com/page-7');

    // 1 non-html
    ledger.recordSkippedNonHtml('https://example.com/page-8', 'https://example.com/page-8', 'application/pdf');

    // 1 redirected
    ledger.recordRedirected('https://example.com/page-9', 'https://example.com/page-9', 'https://example.com/page-1');

    // 1 not crawled limit
    ledger.recordNotCrawledLimit('https://example.com/page-10', 'https://example.com/page-10', 2, 'utility');

    const summary = ledger.reconcile();
    const invariants = ledger.verifyInvariants(4, 15, 15);

    expect(summary.discovered).toBe(10);
    expect(summary.crawledOk).toBe(4);
    expect(summary.failed).toBe(2);
    expect(summary.skippedRobots).toBe(1);
    expect(summary.skippedNonHtml).toBe(1);
    expect(summary.redirected).toBe(1);
    expect(summary.notCrawledLimit).toBe(1);

    expect(invariants.isValid).toBe(true);
    expect(invariants.warnings).toHaveLength(0);
  });

  it('runs a 500-URL stress test with zero dropped URLs', () => {
    const ledger = new ResultLedger();

    // 500 simulated URLs:
    // 200 normal (crawled_ok)
    // 100 404 (failed)
    // 50 500 (failed)
    // 50 redirects (redirected)
    // 50 timeouts (failed)
    // 50 robots-blocked (skipped_robots)

    let urlCounter = 0;

    // 200 normal
    for (let i = 0; i < 200; i++) {
      urlCounter++;
      const url = `https://example.com/page-${urlCounter}`;
      ledger.registerDiscovery(url, url, 1, undefined, 'article');
      ledger.recordCrawledOk(url, {
        url,
        normalizedUrl: url,
        statusCode: 200,
        isHtml: true,
        wordCount: 450,
        structuredData: [],
        internalLinks: [],
        externalLinks: [],
      } as unknown as ExtractedPageData);
    }

    // 100 404
    for (let i = 0; i < 100; i++) {
      urlCounter++;
      const url = `https://example.com/not-found-${urlCounter}`;
      ledger.registerDiscovery(url, url, 2);
      ledger.recordFailed(url, url, 'HTTP_ERROR_404', 'Page Not Found', 404, 2);
    }

    // 50 500
    for (let i = 0; i < 50; i++) {
      urlCounter++;
      const url = `https://example.com/server-error-${urlCounter}`;
      ledger.registerDiscovery(url, url, 2);
      ledger.recordFailed(url, url, 'HTTP_ERROR_500', 'Internal Server Error', 500, 2);
    }

    // 50 redirects
    for (let i = 0; i < 50; i++) {
      urlCounter++;
      const url = `https://example.com/redirect-${urlCounter}`;
      const target = `https://example.com/page-${i + 1}`;
      ledger.registerDiscovery(url, url, 1);
      ledger.recordRedirected(url, url, target, 1);
    }

    // 50 slow/timeouts
    for (let i = 0; i < 50; i++) {
      urlCounter++;
      const url = `https://example.com/timeout-${urlCounter}`;
      ledger.registerDiscovery(url, url, 3);
      ledger.recordFailed(url, url, 'TIMEOUT', 'Operation timed out after 10000ms', 0, 3);
    }

    // 50 robots-blocked
    for (let i = 0; i < 50; i++) {
      urlCounter++;
      const url = `https://example.com/admin/disallowed-${urlCounter}`;
      ledger.registerDiscovery(url, url, 1);
      ledger.recordSkippedRobots(url, url, 1);
    }

    expect(urlCounter).toBe(500);

    const summary = ledger.reconcile();
    expect(summary.discovered).toBe(500);
    expect(summary.crawledOk).toBe(200);
    expect(summary.failed).toBe(200); // 100 404 + 50 500 + 50 timeout
    expect(summary.redirected).toBe(50);
    expect(summary.skippedRobots).toBe(50);
    expect(summary.skippedNonHtml).toBe(0);
    expect(summary.notCrawledLimit).toBe(0);

    // Assert Invariant 1
    const totalSum =
      summary.crawledOk +
      summary.failed +
      summary.skippedRobots +
      summary.skippedNonHtml +
      summary.notCrawledLimit +
      summary.redirected;
    expect(totalSum).toBe(500);

    const invariants = ledger.verifyInvariants(200, 42, 42);
    expect(invariants.isValid).toBe(true);
  });

  it('stratified sampler maintains representation across page types and depths', () => {
    const candidates: CrawlCandidate[] = [];
    const types: PageType[] = ['home', 'collection', 'product', 'article', 'about', 'contact', 'policy', 'utility'];

    // Generate 300 candidates across diverse depths and types
    for (let i = 0; i < 300; i++) {
      const pageType = types[i % types.length];
      const depth = (i % 4); // 0, 1, 2, 3
      candidates.push({
        url: `https://example.com/${pageType}/${i}`,
        normalizedUrl: `https://example.com/${pageType}/${i}`,
        depth,
        pageType,
      });
    }

    const sampleResult = sampleStratifiedCandidates(candidates, 50);

    expect(sampleResult.sampled.length).toBe(50);
    expect(sampleResult.unselected.length).toBe(250);
    expect(sampleResult.totalDiscovered).toBe(300);

    // Verify all page types received allocation
    const sampledTypes = Object.entries(sampleResult.pageTypeCounts).filter(([_, count]) => count > 0);
    expect(sampledTypes.length).toBeGreaterThanOrEqual(6);

    // Verify multiple depths are represented
    const sampledDepths = Object.keys(sampleResult.depthCounts);
    expect(sampledDepths.length).toBeGreaterThanOrEqual(3);
  });
});
