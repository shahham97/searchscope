import {
  AuditConfig,
  AuditReport,
  CrawlDiagnostic,
  ExtractedPageData,
  FailureCode,
  LedgerEntry,
} from '../../types/audit';
import { ResultLedger } from './ledger';
import { sampleStratifiedCandidates, CrawlCandidate } from './stratified-sampler';

export interface ProgressCallbackData {
  status: string;
  crawledCount: number;
  discoveredCount: number;
  currentUrl: string;
  isBatching?: boolean;
}

export async function orchestrateClientAudit(
  targetUrl: string,
  config: Partial<AuditConfig> = {},
  onProgress?: (progress: ProgressCallbackData) => void,
  abortSignal?: AbortSignal
): Promise<AuditReport> {
  const effectiveConfig: AuditConfig = {
    targetUrl,
    auditDepth: config.auditDepth || 'quick',
    maxPages:
      config.maxPages ||
      (config.auditDepth === 'quick' ? 25 : config.auditDepth === 'deep' ? 250 : 100),
    includeContentAnalysis: config.includeContentAnalysis ?? true,
    includeAeoGeo: config.includeAeoGeo ?? true,
    includeStructuredData: config.includeStructuredData ?? true,
    checkBrokenLinks: config.checkBrokenLinks ?? true,
    searchDiscoveryEnabled: config.searchDiscoveryEnabled ?? false,
    userAgentType: config.userAgentType || 'browser',
    respectRobotsTxt: config.respectRobotsTxt ?? true,
    enableHeadlessRendering: config.enableHeadlessRendering ?? false,
  };

  const ledger = new ResultLedger();
  const startTime = Date.now();

  // Step 1: Initialize audit (robots.txt, sitemaps, initial seeds)
  onProgress?.({
    status: 'Inspecting robots.txt, sitemaps, and security validation...',
    crawledCount: 0,
    discoveredCount: 1,
    currentUrl: targetUrl,
    isBatching: true,
  });

  const initRes = await fetch('/api/audit/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: targetUrl,
      maxPages: effectiveConfig.maxPages,
      userAgentType: effectiveConfig.userAgentType,
    }),
    signal: abortSignal,
  });

  if (!initRes.ok) {
    const errorData = await initRes.json().catch(() => ({}));
    throw new Error(errorData.error || `Init failed with HTTP ${initRes.status}`);
  }

  const initData = await initRes.json();
  const {
    canonicalOrigin,
    canonicalHostname,
    targetNormalizedUrl,
    robotsData,
    sitemapsFound,
    llmsTxtPresent,
    initialSeeds,
  } = initData;

  // Register initial discovered seeds into ledger
  const queue: Array<{ url: string; depth: number; discoveredFrom?: string }> = [];

  for (const seed of initialSeeds) {
    ledger.registerDiscovery(
      seed.url,
      seed.normalizedUrl,
      seed.depth,
      seed.discoveredFrom,
      seed.pageType
    );
    queue.push({
      url: seed.url,
      depth: seed.depth,
      discoveredFrom: seed.discoveredFrom,
    });
  }

  const collectedPages: ExtractedPageData[] = [];
  const allDiagnostics: CrawlDiagnostic[] = [];
  const visitedUrls = new Set<string>();

  const BATCH_SIZE = 5; // Safe chunk size per batch
  const MAX_RETRIES = 3;

  // Step 2: Batch crawl loop
  while (queue.length > 0 && collectedPages.length < effectiveConfig.maxPages) {
    if (abortSignal?.aborted) {
      throw new Error('Audit cancelled by user');
    }

    // Slice next batch
    const currentBatchItems: Array<{ url: string; depth: number; discoveredFrom?: string }> = [];
    while (
      queue.length > 0 &&
      currentBatchItems.length < BATCH_SIZE &&
      collectedPages.length + currentBatchItems.length < effectiveConfig.maxPages
    ) {
      const candidate = queue.shift()!;
      if (!visitedUrls.has(candidate.url)) {
        visitedUrls.add(candidate.url);
        currentBatchItems.push(candidate);
      }
    }

    if (currentBatchItems.length === 0) {
      break;
    }

    onProgress?.({
      status: `Crawling batch (${collectedPages.length + 1}–${Math.min(
        collectedPages.length + currentBatchItems.length,
        effectiveConfig.maxPages
      )} of ${effectiveConfig.maxPages})...`,
      crawledCount: collectedPages.length,
      discoveredCount: ledger.size(),
      currentUrl: currentBatchItems[0].url,
      isBatching: true,
    });

    // Execute batch with retry logic
    let batchSuccess = false;
    let batchAttempt = 0;
    let batchData: any = null;

    while (!batchSuccess && batchAttempt < MAX_RETRIES) {
      batchAttempt++;
      try {
        const batchRes = await fetch('/api/audit/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: currentBatchItems,
            canonicalOrigin,
            canonicalHostname,
            userAgentType: effectiveConfig.userAgentType,
            respectRobotsTxt: effectiveConfig.respectRobotsTxt,
            enableHeadlessRendering: effectiveConfig.enableHeadlessRendering,
            llmsTxtPresent,
            robotsData,
          }),
          signal: abortSignal,
        });

        if (batchRes.ok) {
          batchData = await batchRes.json();
          batchSuccess = true;
        } else {
          // If server error, back off briefly before retrying
          if (batchAttempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, batchAttempt - 1)));
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        if (batchAttempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, batchAttempt - 1)));
        }
      }
    }

    if (batchSuccess && batchData?.results) {
      // Process batch results into ledger
      for (const res of batchData.results) {
        if (res.state === 'crawled_ok' && res.pageData) {
          ledger.recordCrawledOk(res.normalizedUrl, res.pageData);
          collectedPages.push(res.pageData);
        } else if (res.state === 'failed') {
          ledger.recordFailed(
            res.url,
            res.normalizedUrl,
            res.failureCode || 'CONNECTION_REFUSED',
            res.failureHint || 'Request failed',
            res.statusCode,
            res.depth
          );
          if (res.pageData) {
            collectedPages.push(res.pageData);
          }
        } else if (res.state === 'skipped_robots') {
          ledger.recordSkippedRobots(res.url, res.normalizedUrl, res.depth);
        } else if (res.state === 'skipped_non_html') {
          ledger.recordSkippedNonHtml(res.url, res.normalizedUrl, res.contentType || '', res.depth);
        } else if (res.state === 'redirected') {
          ledger.recordRedirected(res.url, res.normalizedUrl, res.redirectTarget || '', res.depth);
          if (res.pageData) {
            collectedPages.push(res.pageData);
          }
        }
      }

      if (batchData.diagnostics) {
        allDiagnostics.push(...batchData.diagnostics);
      }

      // Add discovered links to ledger and queue
      if (batchData.discoveredLinks) {
        for (const link of batchData.discoveredLinks) {
          ledger.registerDiscovery(
            link.url,
            link.normalizedUrl,
            link.depth,
            link.discoveredFrom,
            link.pageType
          );
          if (!visitedUrls.has(link.url) && !queue.some((q) => q.url === link.url)) {
            if (queue.length < effectiveConfig.maxPages * 4) {
              queue.push({
                url: link.url,
                depth: link.depth,
                discoveredFrom: link.discoveredFrom,
              });
            }
          }
        }
      }
    } else {
      // Batch exhausted all retries: mark all items as failed('BATCH_LOST') in the ledger!
      for (const item of currentBatchItems) {
        const failureCode: FailureCode = 'BATCH_LOST';
        const failureHint = 'Batch network request timed out or failed after 3 retries';
        ledger.recordFailed(item.url, item.url, failureCode, failureHint, 0, item.depth);
        allDiagnostics.push({
          url: item.url,
          code: failureCode,
          message: failureHint,
          hint: 'The crawler dispatched this batch but received no response from the execution engine.',
          stage: 'response',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Step 3: Stratified sampling for any remaining discovered URLs
  const uncrawledCandidates: CrawlCandidate[] = [];
  for (const entry of ledger.getAllEntries()) {
    if (entry.state === 'not_crawled_limit' && !visitedUrls.has(entry.url)) {
      uncrawledCandidates.push({
        url: entry.url,
        normalizedUrl: entry.normalizedUrl,
        depth: entry.depth,
        discoveredFrom: entry.discoveredFrom,
        pageType: entry.pageType,
      });
    }
  }

  let samplingDistribution: string | undefined;
  if (uncrawledCandidates.length > 0) {
    const sampleResult = sampleStratifiedCandidates(
      uncrawledCandidates,
      effectiveConfig.maxPages
    );
    samplingDistribution = sampleResult.distributionSummary;
    for (const unselected of sampleResult.unselected) {
      ledger.recordNotCrawledLimit(
        unselected.url,
        unselected.normalizedUrl,
        unselected.depth,
        unselected.pageType
      );
    }
  }

  const ledgerSummary = ledger.reconcile();
  const crawlDurationMs = Date.now() - startTime;

  // Step 4: Run comprehensive analysis and score calculation
  onProgress?.({
    status: 'Running multi-engine analysis across SEO, AEO, and GEO dimensions...',
    crawledCount: collectedPages.length,
    discoveredCount: ledgerSummary.discovered,
    currentUrl: targetNormalizedUrl,
    isBatching: false,
  });

  const analyzeRes = await fetch('/api/audit/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUrl,
      canonicalOrigin,
      canonicalHostname,
      config: effectiveConfig,
      pages: collectedPages,
      ledgerEntries: ledger.getAllEntries(),
      diagnostics: allDiagnostics,
      sitemapsFound,
      robotsTxtPresent: robotsData?.present || false,
      llmsTxtPresent,
      crawlDurationMs,
      aiBotsAudit: robotsData?.aiBotsAudit,
      samplingDistribution,
    }),
    signal: abortSignal,
  });

  if (!analyzeRes.ok) {
    const err = await analyzeRes.json().catch(() => ({}));
    throw new Error(err.error || `Analysis failed with HTTP ${analyzeRes.status}`);
  }

  const report: AuditReport = await analyzeRes.json();
  return report;
}
