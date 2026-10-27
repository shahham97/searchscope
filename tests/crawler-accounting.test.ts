import { describe, it, expect } from 'vitest';
import { executeBoundedCrawl } from '../src/lib/crawler/crawler';
import { AuditConfig } from '../src/types/audit';

describe('Crawl Accounting & Invariant Verification', () => {
  it('strictly satisfies discovered = crawled_ok + failed + skipped_robots + not_crawled_limit + non_html', async () => {
    const config: AuditConfig = {
      targetUrl: 'https://example.com',
      auditDepth: 'quick',
      maxPages: 2,
      includeContentAnalysis: false,
      includeAeoGeo: false,
      includeStructuredData: false,
      checkBrokenLinks: false,
      searchDiscoveryEnabled: false,
      userAgentType: 'bot',
      respectRobotsTxt: true,
    };

    const result = await executeBoundedCrawl('https://example.com', config);
    const stats = result.crawlStats;

    const sum =
      stats.successfulPagesCount +
      stats.totalPagesFailed +
      stats.skippedRobotsCount +
      stats.skippedNonHtmlCount +
      stats.notCrawledLimitCount;

    expect(stats.totalPagesDiscovered).toBe(sum);
    expect(stats.totalPagesCrawled).toBe(result.pages.length);
  }, 20000);
});
