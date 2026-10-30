import { describe, it, expect } from 'vitest';
import { executeBoundedCrawl } from '../src/lib/crawler/crawler';
import { AuditConfig } from '../src/types/audit';

describe('Real Live Crawl on stewart.com', () => {
  it('diagnoses crawl behavior on stewart.com', async () => {
    const config: AuditConfig = {
      targetUrl: 'https://stewart.com',
      auditDepth: 'quick',
      maxPages: 5,
      includeContentAnalysis: true,
      includeAeoGeo: true,
      includeStructuredData: true,
      checkBrokenLinks: true,
      searchDiscoveryEnabled: false,
    };

    const result = await executeBoundedCrawl('https://stewart.com', config);
    console.log('stewart.com result:', {
      isCrawlFailed: result.isCrawlFailed,
      crawlFailureReason: result.crawlFailureReason,
      pagesLength: result.pages.length,
      successfulPagesCount: result.crawlStats.successfulPagesCount,
      failedPagesCount: result.crawlStats.failedPagesCount,
      pages: result.pages.map(p => ({
        url: p.url,
        normalizedUrl: p.normalizedUrl,
        statusCode: p.statusCode,
        error: p.error,
        failureCode: p.failureCode,
        failureHint: p.failureHint,
        title: p.title,
        wordCount: p.wordCount,
      }))
    });
  }, 60000);
});
