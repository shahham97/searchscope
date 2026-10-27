import { safeFetch } from '../security/safe-fetch';
import { normalizeUrl, isInternalUrl } from './url-utils';
import { fetchRobotsTxt, isPathAllowed, RobotsTxtData } from './robots';
import { discoverSitemapUrls } from './sitemap';
import { parseHtmlContent } from '../extractor/html-parser';
import { isLikelySpaShell, renderHeadlessDom } from '../extractor/headless-renderer';
import { ResultLedger } from './ledger';
import { sampleStratifiedCandidates, CrawlCandidate } from './stratified-sampler';
import { classifyUrlOnly } from '../analyzer/page-classifier';
import {
  AuditConfig,
  CrawlStatistics,
  ExtractedPageData,
  CrawlDiagnostic,
  FailureCode,
  CrawlLedgerSummary,
} from '../../types/audit';

export interface CrawlResult {
  pages: ExtractedPageData[];
  crawlStats: CrawlStatistics;
  diagnostics: CrawlDiagnostic[];
  isCrawlFailed: boolean;
  crawlFailureReason?: string;
  targetNormalizedUrl: string;
  targetDomain: string;
  ledger: ResultLedger;
  ledgerSummary: CrawlLedgerSummary;
  samplingDistribution?: string;
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
  const maxPages =
    config.maxPages ||
    (config.auditDepth === 'quick' ? 25 : config.auditDepth === 'standard' ? 100 : 250);
  const maxExecutionMs = 50000; // 50s execution budget for serverless safety

  let initialUrl = targetUrl.trim();
  if (!initialUrl.startsWith('http://') && !initialUrl.startsWith('https://')) {
    initialUrl = `https://${initialUrl}`;
  }

  let initialParsed = new URL(initialUrl);
  let canonicalOrigin = initialParsed.origin;
  let canonicalHostname = initialParsed.hostname;

  const diagnostics: CrawlDiagnostic[] = [];
  const ledger = new ResultLedger();

  // 1. Fetch robots.txt
  onProgress?.({
    status: 'Inspecting robots.txt and sitemaps...',
    crawledCount: 0,
    discoveredCount: 1,
    currentUrl: `${canonicalOrigin}/robots.txt`,
  });

  const robotsData: RobotsTxtData = await fetchRobotsTxt(canonicalOrigin);

  // 2. Discover sitemaps
  const sitemapResult = await discoverSitemapUrls(canonicalOrigin, robotsData.sitemaps, maxPages);

  // 3. Check for llms.txt at root (GEO readiness heuristic)
  let llmsTxtPresent = false;
  try {
    const llmsRes = await safeFetch(`${canonicalOrigin}/llms.txt`, {
      timeoutMs: 4000,
      maxBytes: 200000,
      userAgentType: config.userAgentType,
    });
    if (llmsRes.statusCode === 200 && llmsRes.body.trim().length > 0) {
      llmsTxtPresent = true;
    }
  } catch {
    llmsTxtPresent = false;
  }

  // 4. Initialize Queue and Canonical Host Discovery
  const queue: Array<{ url: string; depth: number; discoveredFrom?: string }> = [];
  const visitedSet = new Set<string>();
  const visitedNormalizedPages = new Set<string>();
  const pages: ExtractedPageData[] = [];

  const normalizedInitial = normalizeUrl(initialUrl, canonicalOrigin) || initialUrl;
  ledger.registerDiscovery(initialUrl, normalizedInitial, 0, undefined, 'home');
  queue.push({ url: normalizedInitial, depth: 0 });

  // Seed queue with sitemap URLs
  for (const sitemapUrl of sitemapResult.discoveredUrls) {
    const norm = normalizeUrl(sitemapUrl, canonicalOrigin);
    if (norm && isInternalUrl(norm, canonicalHostname, true)) {
      const pageType = classifyUrlOnly(norm);
      ledger.registerDiscovery(sitemapUrl, norm, 1, 'sitemap.xml', pageType);
      if (!queue.some((q) => q.url === norm)) {
        queue.push({ url: norm, depth: 1, discoveredFrom: 'sitemap.xml' });
      }
    }
  }

  let budgetExhausted = false;

  // 5. Main Crawl Loop
  while (queue.length > 0 && pages.length < maxPages) {
    if (Date.now() - startTime >= maxExecutionMs) {
      budgetExhausted = true;
      break;
    }

    const currentItem = queue.shift()!;
    const currentUrl = currentItem.url;
    const currentDepth = currentItem.depth;
    const normCurrent = normalizeUrl(currentUrl, canonicalOrigin) || currentUrl;

    if (visitedSet.has(currentUrl) || visitedNormalizedPages.has(normCurrent)) {
      continue;
    }
    visitedSet.add(currentUrl);
    visitedNormalizedPages.add(normCurrent);

    // Respect robots.txt if requested (default: true)
    if (config.respectRobotsTxt !== false) {
      try {
        const parsedPath = new URL(currentUrl).pathname;
        if (!isPathAllowed(parsedPath, robotsData, 'SearchScope-Auditor')) {
          ledger.recordSkippedRobots(currentUrl, normCurrent, currentDepth);
          diagnostics.push({
            url: currentUrl,
            code: 'ROBOTS_BLOCKED',
            message: `URL disallowed by robots.txt directive`,
            hint: 'Robots.txt blocks search engine crawlers from indexing this path.',
            stage: 'policy',
            timestamp: new Date().toISOString(),
          });
          continue;
        }
      } catch {
        ledger.recordSkippedRobots(currentUrl, normCurrent, currentDepth);
        continue;
      }
    }

    onProgress?.({
      status: `Crawling page ${pages.length + 1} of ${maxPages}...`,
      crawledCount: pages.length,
      discoveredCount: ledger.size(),
      currentUrl,
    });

    try {
      const res = await safeFetch(currentUrl, {
        timeoutMs: 8000,
        allowedHostname: canonicalHostname,
        allowSubdomains: true,
        userAgentType: config.userAgentType || 'browser',
      });

      // Update canonical host if initial root redirected (e.g. apex to www)
      if (pages.length === 0 && res.url !== currentUrl) {
        try {
          const finalParsed = new URL(res.url);
          canonicalOrigin = finalParsed.origin;
          canonicalHostname = finalParsed.hostname;
        } catch {
          // ignore
        }
      }

      const isHtml = res.contentType.toLowerCase().includes('text/html');

      if (isHtml) {
        let finalHtml = res.body;
        let isJsRendered = false;
        let rawVsRenderedDiff;

        // Check if headless rendering is needed/enabled
        let rawH1s: string[] | undefined;
        let renderedH1s: string[] | undefined;
        let isH1OnlyInJs: boolean | undefined;

        if (config.enableHeadlessRendering && isLikelySpaShell(res.body, 100)) {
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

        if (visitedNormalizedPages.has(pageData.normalizedUrl) && pageData.normalizedUrl !== normCurrent) {
          // Already have an extracted page for this canonical destination
          ledger.recordRedirected(currentUrl, normCurrent, pageData.normalizedUrl, currentDepth);
          continue;
        }
        visitedNormalizedPages.add(pageData.normalizedUrl);

        if (res.failureCode) {
          pageData.failureCode = res.failureCode;
          pageData.failureHint = res.failureHint;
          ledger.recordFailed(
            res.url,
            pageData.normalizedUrl,
            res.failureCode,
            res.failureHint || `HTTP ${res.statusCode}`,
            res.statusCode,
            currentDepth
          );
          diagnostics.push({
            url: currentUrl,
            code: res.failureCode,
            statusCode: res.statusCode,
            message: `HTTP ${res.statusCode}: ${res.statusText}`,
            hint: res.failureHint || 'Request returned an error status code.',
            stage: 'response',
            timestamp: new Date().toISOString(),
          });
        } else {
          ledger.recordCrawledOk(pageData.normalizedUrl, pageData);
        }

        pages.push(pageData);

        // Discover internal links
        for (const link of pageData.internalLinks) {
          const normLink = link.url;
          if (
            normLink &&
            isInternalUrl(normLink, canonicalHostname, true)
          ) {
            const pageType = classifyUrlOnly(normLink);
            ledger.registerDiscovery(normLink, normLink, currentDepth + 1, currentUrl, pageType);

            if (!visitedSet.has(normLink) && !queue.some((q) => q.url === normLink)) {
              if (queue.length < maxPages * 4) {
                queue.push({ url: normLink, depth: currentDepth + 1, discoveredFrom: currentUrl });
              }
            }
          }
        }
      } else {
        // Non-HTML resource visited
        ledger.recordSkippedNonHtml(currentUrl, normCurrent, res.contentType, currentDepth);
        diagnostics.push({
          url: currentUrl,
          code: 'CONTENT_TYPE_UNSUPPORTED',
          statusCode: res.statusCode,
          message: `Non-HTML content type: ${res.contentType}`,
          hint: 'Resource is an image, PDF, or binary feed not suitable for HTML audit.',
          stage: 'response',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      const failureCode: FailureCode = err.failureCode || 'CONNECTION_REFUSED';
      const failureHint: string = err.failureHint || err.message || 'Request failed to complete';
      const durationMs = err.durationMs || 0;

      ledger.recordFailed(
        currentUrl,
        normCurrent,
        failureCode,
        failureHint,
        err.statusCode || 0,
        currentDepth
      );

      diagnostics.push({
        url: currentUrl,
        code: failureCode,
        message: err.message,
        hint: failureHint,
        stage: err.message?.includes('SSRF') ? 'policy' : err.message?.includes('DNS') ? 'dns' : 'connect',
        timestamp: new Date().toISOString(),
      });

      pages.push({
        url: currentUrl,
        normalizedUrl: normCurrent,
        statusCode: 0,
        statusText: failureCode,
        fetchDurationMs: durationMs,
        contentType: '',
        contentLengthBytes: 0,
        isHtml: false,
        failureCode,
        failureHint,
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
        error: `${failureCode}: ${failureHint}`,
      });
    }

    // Politeness throttle (150ms delay between pages)
    await new Promise((r) => setTimeout(r, 150));
  }

  // 6. Stratified sampling / queue reconciliation for remaining discovered URLs
  const remainingCandidates: CrawlCandidate[] = [];
  for (const entry of ledger.getAllEntries()) {
    if (entry.state === 'not_crawled_limit' && !visitedSet.has(entry.url) && !visitedNormalizedPages.has(entry.normalizedUrl)) {
      remainingCandidates.push({
        url: entry.url,
        normalizedUrl: entry.normalizedUrl,
        depth: entry.depth,
        discoveredFrom: entry.discoveredFrom,
        pageType: entry.pageType || classifyUrlOnly(entry.url),
      });
    }
  }

  let samplingDistribution: string | undefined;
  if (remainingCandidates.length > 0) {
    const sampleResult = sampleStratifiedCandidates(remainingCandidates, maxPages);
    samplingDistribution = sampleResult.distributionSummary;

    // All unselected remain as 'not_crawled_limit'
    for (const unselected of sampleResult.unselected) {
      ledger.recordNotCrawledLimit(unselected.url, unselected.normalizedUrl, unselected.depth, unselected.pageType);
    }
  }

  // Final reconcile of ledger
  const ledgerSummary = ledger.reconcile();

  const crawlDurationMs = Date.now() - startTime;
  const isCrawlFailed = ledgerSummary.crawledOk === 0 && pages.length > 0;
  const crawlFailureReason = isCrawlFailed
    ? `All ${pages.length} attempted page fetches failed. See Crawl Diagnostics for details (${diagnostics[0]?.hint || 'Target server unreachable'}).`
    : undefined;

  const uncrawledUrls = ledger
    .getEntriesByState('not_crawled_limit')
    .map((e) => e.url);

  const crawlStats: CrawlStatistics = {
    totalPagesDiscovered: ledgerSummary.discovered,
    totalPagesCrawled: ledgerSummary.crawledOk + ledgerSummary.failed,
    totalPagesSkipped: ledgerSummary.skippedRobots + ledgerSummary.skippedNonHtml,
    totalPagesFailed: ledgerSummary.failed,
    successfulPagesCount: ledgerSummary.crawledOk,
    skippedRobotsCount: ledgerSummary.skippedRobots,
    skippedNonHtmlCount: ledgerSummary.skippedNonHtml,
    notCrawledLimitCount: ledgerSummary.notCrawledLimit,
    uncrawledUrls,
    crawlDurationMs,
    robotsTxtPresent: robotsData.present,
    sitemapDetected: sitemapResult.sitemapsFound.length > 0,
    sitemapsFound: sitemapResult.sitemapsFound,
    llmsTxtPresent,
    crawlBudgetExhausted: budgetExhausted || pages.length >= maxPages,
    aiBotsAudit: robotsData.aiBotsAudit,
  };

  return {
    pages,
    crawlStats,
    diagnostics,
    isCrawlFailed,
    crawlFailureReason,
    targetNormalizedUrl: canonicalOrigin,
    targetDomain: canonicalHostname,
    ledger,
    ledgerSummary,
    samplingDistribution,
  };
}
