import { safeFetch } from '../security/safe-fetch';
import { normalizeUrl, isInternalUrl } from './url-utils';
import { fetchRobotsTxt, isPathAllowed, RobotsTxtData } from './robots';
import { discoverSitemapUrls } from './sitemap';
import { parseHtmlContent } from '../extractor/html-parser';
import { AuditConfig, CrawlStatistics, ExtractedPageData } from '../../types/audit';

export interface CrawlResult {
  pages: ExtractedPageData[];
  crawlStats: CrawlStatistics;
  targetNormalizedUrl: string;
  targetDomain: string;
}

export async function executeBoundedCrawl(
  targetUrl: string,
  config: AuditConfig,
  onProgress?: (progress: {
    status: string;
    crawledCount: number;
    discoveredCount: number;
    currentUrl: string;
  }) => void
): Promise<CrawlResult> {
  const startTime = Date.now();
  const maxPages = config.maxPages || (config.auditDepth === 'quick' ? 25 : config.auditDepth === 'standard' ? 100 : 200);
  const maxExecutionMs = 45000; // 45 seconds safe ceiling for serverless functions

  let initialUrl = targetUrl.trim();
  if (!initialUrl.startsWith('http://') && !initialUrl.startsWith('https://')) {
    initialUrl = `https://${initialUrl}`;
  }

  const initialParsed = new URL(initialUrl);
  const origin = initialParsed.origin;
  const hostname = initialParsed.hostname;

  // 1. Fetch robots.txt
  onProgress?.({
    status: 'Inspecting robots.txt and sitemaps...',
    crawledCount: 0,
    discoveredCount: 1,
    currentUrl: `${origin}/robots.txt`,
  });

  const robotsData: RobotsTxtData = await fetchRobotsTxt(origin);

  // 2. Discover sitemaps
  const sitemapResult = await discoverSitemapUrls(origin, robotsData.sitemaps, maxPages);

  // 3. Check for llms.txt at root (GEO readiness heuristic)
  let llmsTxtPresent = false;
  try {
    const llmsRes = await safeFetch(`${origin}/llms.txt`, { timeoutMs: 3000, maxBytes: 100000 });
    if (llmsRes.statusCode === 200 && llmsRes.body.trim().length > 0) {
      llmsTxtPresent = true;
    }
  } catch {
    llmsTxtPresent = false;
  }

  // 4. Initialize Queue
  const queue: string[] = [];
  const discoveredSet = new Set<string>();
  const visitedSet = new Set<string>();
  const pages: ExtractedPageData[] = [];

  let skippedCount = 0;
  let failedCount = 0;

  // Enqueue initial home page
  const normalizedInitial = normalizeUrl(initialUrl, origin) || initialUrl;
  queue.push(normalizedInitial);
  discoveredSet.add(normalizedInitial);

  // Seed queue with sitemap URLs (up to maxPages * 2)
  for (const sitemapUrl of sitemapResult.discoveredUrls) {
    const norm = normalizeUrl(sitemapUrl, origin);
    if (norm && isInternalUrl(norm, hostname) && !discoveredSet.has(norm)) {
      discoveredSet.add(norm);
      if (queue.length < maxPages * 2) {
        queue.push(norm);
      }
    }
  }

  let budgetExhausted = false;

  // 5. Main Crawl Loop
  while (queue.length > 0 && pages.length < maxPages) {
    // Check execution time limit
    if (Date.now() - startTime >= maxExecutionMs) {
      budgetExhausted = true;
      break;
    }

    const currentUrl = queue.shift()!;
    if (visitedSet.has(currentUrl)) continue;
    visitedSet.add(currentUrl);

    // Check robots.txt permissions
    try {
      const parsedPath = new URL(currentUrl).pathname;
      if (!isPathAllowed(parsedPath, robotsData)) {
        skippedCount++;
        continue;
      }
    } catch {
      skippedCount++;
      continue;
    }

    onProgress?.({
      status: `Crawling page ${pages.length + 1} of ${maxPages}...`,
      crawledCount: pages.length,
      discoveredCount: discoveredSet.size,
      currentUrl,
    });

    try {
      const res = await safeFetch(currentUrl, {
        timeoutMs: 6000,
        allowedHostname: hostname,
        allowSubdomains: false,
      });

      const isHtml = res.contentType.toLowerCase().includes('text/html');

      if (isHtml) {
        const pageData = parseHtmlContent(
          res.url,
          res.body,
          res.headers,
          res.durationMs,
          res.statusCode,
          res.statusText
        );
        pageData.llmsTxtDetected = llmsTxtPresent;

        pages.push(pageData);

        // Discover new links from HTML
        for (const link of pageData.internalLinks) {
          const normLink = link.url;
          if (normLink && !discoveredSet.has(normLink) && isInternalUrl(normLink, hostname)) {
            discoveredSet.add(normLink);
            if (queue.length < maxPages * 3) {
              queue.push(normLink);
            }
          }
        }
      } else {
        // Non-HTML resource visited
        skippedCount++;
      }
    } catch (err: unknown) {
      failedCount++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      pages.push({
        url: currentUrl,
        normalizedUrl: currentUrl,
        statusCode: 0,
        statusText: 'Failed',
        fetchDurationMs: 0,
        contentType: '',
        contentLengthBytes: 0,
        isHtml: false,
        titleLength: 0,
        metaDescriptionLength: 0,
        robotsDirectives: [],
        h1s: [],
        h2s: [],
        h3s: [],
        headingHierarchyValid: false,
        headingIssues: [],
        internalLinks: [],
        externalLinks: [],
        brokenInternalLinks: [],
        images: [],
        wordCount: 0,
        textSnippet: '',
        detectedEntities: [],
        hasFAQMarkupOrContent: false,
        hasDirectDefinitions: false,
        hasTablesOrLists: false,
        hasAuthorAttribution: false,
        hasContactOrAboutEvidence: false,
        structuredData: [],
        isHttps: currentUrl.startsWith('https://'),
        hasCompression: false,
        renderBlockingResourceCount: 0,
        domElementCount: 0,
        error: errorMsg,
      });
    }
  }

  const crawlDurationMs = Date.now() - startTime;

  const crawlStats: CrawlStatistics = {
    totalPagesDiscovered: discoveredSet.size,
    totalPagesCrawled: pages.length,
    totalPagesSkipped: skippedCount,
    totalPagesFailed: failedCount,
    crawlDurationMs,
    robotsTxtPresent: robotsData.present,
    sitemapDetected: sitemapResult.sitemapsFound.length > 0,
    sitemapsFound: sitemapResult.sitemapsFound,
    llmsTxtPresent,
    crawlBudgetExhausted: budgetExhausted || pages.length >= maxPages,
  };

  return {
    pages,
    crawlStats,
    targetNormalizedUrl: normalizedInitial,
    targetDomain: hostname,
  };
}
