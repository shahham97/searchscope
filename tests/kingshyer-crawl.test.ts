import { describe, it, expect } from 'vitest';
import { executeBoundedCrawl } from '../src/lib/crawler/crawler';
import { AuditConfig } from '../src/types/audit';

describe('Real Live Crawl on kingshyer.com', () => {
  it('crawls real URLs with HTTP 200, non-zero word counts, real titles, and valid duration', async () => {
    const config: AuditConfig = {
      targetUrl: 'https://kingshyer.com',
      auditDepth: 'quick',
      maxPages: 5,
      includeContentAnalysis: true,
      includeAeoGeo: true,
      includeStructuredData: true,
      checkBrokenLinks: true,
      searchDiscoveryEnabled: false,
    };

    const result = await executeBoundedCrawl('https://kingshyer.com', config);

    expect(result.isCrawlFailed).toBe(false);
    expect(result.crawlStats.successfulPagesCount).toBeGreaterThan(0);
    expect(result.pages.length).toBeGreaterThan(0);

    const firstPage = result.pages[0];
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.wordCount).toBeGreaterThan(10);
    expect(firstPage.title).toBeDefined();
    expect(firstPage.fetchDurationMs).toBeGreaterThan(0);

    console.log('Verified kingshyer.com crawl success:', {
      successfulPages: result.crawlStats.successfulPagesCount,
      firstPageTitle: firstPage.title,
      firstPageWords: firstPage.wordCount,
      durationMs: firstPage.fetchDurationMs,
      schemasFound: firstPage.structuredData.length,
      aiBotsAudit: result.crawlStats.aiBotsAudit?.length
    });
  }, 30000);
});
