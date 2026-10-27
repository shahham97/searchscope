import {
  ExtractedPageData,
  FailureCode,
  LedgerEntry,
  TerminalState,
  CrawlLedgerSummary,
  DataIntegrityReport,
  PageType,
} from '../../types/audit';

export class ResultLedger {
  private entries = new Map<string, LedgerEntry>();

  constructor(initialEntries?: LedgerEntry[]) {
    if (initialEntries) {
      for (const entry of initialEntries) {
        this.entries.set(entry.normalizedUrl, entry);
      }
    }
  }

  /**
   * Registers a URL into the ledger upon discovery.
   * If already tracked, retains existing terminal state or updates discovery context.
   */
  public registerDiscovery(
    url: string,
    normalizedUrl: string,
    depth: number = 0,
    discoveredFrom?: string,
    pageType?: PageType
  ): void {
    if (!this.entries.has(normalizedUrl)) {
      this.entries.set(normalizedUrl, {
        url,
        normalizedUrl,
        state: 'not_crawled_limit', // provisional default until dispatched/resolved
        depth,
        discoveredFrom,
        pageType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public recordCrawledOk(normalizedUrl: string, pageData: ExtractedPageData): void {
    const existing = this.entries.get(normalizedUrl);
    this.entries.set(normalizedUrl, {
      url: pageData.url,
      normalizedUrl,
      state: 'crawled_ok',
      statusCode: pageData.statusCode,
      pageData,
      depth: existing?.depth ?? 0,
      pageType: pageData.pageType || existing?.pageType,
      discoveredFrom: existing?.discoveredFrom,
      timestamp: new Date().toISOString(),
    });
  }

  public recordFailed(
    url: string,
    normalizedUrl: string,
    failureCode: FailureCode,
    failureHint: string,
    statusCode: number = 0,
    depth: number = 0
  ): void {
    const existing = this.entries.get(normalizedUrl);
    this.entries.set(normalizedUrl, {
      url,
      normalizedUrl,
      state: 'failed',
      statusCode,
      failureCode,
      failureHint,
      depth: existing?.depth ?? depth,
      pageType: existing?.pageType,
      discoveredFrom: existing?.discoveredFrom,
      timestamp: new Date().toISOString(),
    });
  }

  public recordSkippedRobots(url: string, normalizedUrl: string, depth: number = 0): void {
    const existing = this.entries.get(normalizedUrl);
    this.entries.set(normalizedUrl, {
      url,
      normalizedUrl,
      state: 'skipped_robots',
      failureCode: 'ROBOTS_BLOCKED',
      failureHint: 'URL disallowed by robots.txt policy',
      depth: existing?.depth ?? depth,
      pageType: existing?.pageType,
      discoveredFrom: existing?.discoveredFrom,
      timestamp: new Date().toISOString(),
    });
  }

  public recordSkippedNonHtml(
    url: string,
    normalizedUrl: string,
    contentType: string = '',
    statusCode: number = 200,
    depth: number = 0
  ): void {
    const existing = this.entries.get(normalizedUrl);
    this.entries.set(normalizedUrl, {
      url,
      normalizedUrl,
      state: 'skipped_non_html',
      statusCode,
      failureCode: 'CONTENT_TYPE_UNSUPPORTED',
      failureHint: `Non-HTML content type: ${contentType}`,
      depth: existing?.depth ?? depth,
      pageType: existing?.pageType,
      discoveredFrom: existing?.discoveredFrom,
      timestamp: new Date().toISOString(),
    });
  }

  public recordRedirected(
    sourceUrl: string,
    normalizedSourceUrl: string,
    targetUrl: string,
    statusCode: number = 301,
    depth: number = 0
  ): void {
    const existing = this.entries.get(normalizedSourceUrl);
    this.entries.set(normalizedSourceUrl, {
      url: sourceUrl,
      normalizedUrl: normalizedSourceUrl,
      state: 'redirected',
      statusCode,
      redirectTarget: targetUrl,
      depth: existing?.depth ?? depth,
      pageType: existing?.pageType,
      discoveredFrom: existing?.discoveredFrom,
      timestamp: new Date().toISOString(),
    });
  }

  public recordNotCrawledLimit(
    url: string,
    normalizedUrl: string,
    depth: number = 0,
    pageType?: PageType
  ): void {
    const existing = this.entries.get(normalizedUrl);
    this.entries.set(normalizedUrl, {
      url,
      normalizedUrl,
      state: 'not_crawled_limit',
      depth: existing?.depth ?? depth,
      pageType: pageType || existing?.pageType,
      discoveredFrom: existing?.discoveredFrom,
      timestamp: new Date().toISOString(),
    });
  }

  public getEntry(normalizedUrl: string): LedgerEntry | undefined {
    return this.entries.get(normalizedUrl);
  }

  public getAllEntries(): LedgerEntry[] {
    return Array.from(this.entries.values());
  }

  public getEntriesByState(state: TerminalState): LedgerEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.state === state);
  }

  public getCrawledOkPages(): ExtractedPageData[] {
    const pages: ExtractedPageData[] = [];
    for (const entry of this.entries.values()) {
      if (entry.state === 'crawled_ok' && entry.pageData) {
        pages.push(entry.pageData);
      }
    }
    return pages;
  }

  public getDiscoveredCount(): number {
    return this.entries.size;
  }

  public size(): number {
    return this.entries.size;
  }

  /**
   * Reconciles the ledger and computes counts for all terminal states.
   * Guarantees discovered = crawled_ok + failed + skipped_robots + skipped_non_html + not_crawled_limit + redirected.
   */
  public reconcile(): CrawlLedgerSummary {
    let crawledOk = 0;
    let failed = 0;
    let skippedRobots = 0;
    let skippedNonHtml = 0;
    let notCrawledLimit = 0;
    let redirected = 0;
    const warnings: string[] = [];

    for (const entry of this.entries.values()) {
      switch (entry.state) {
        case 'crawled_ok':
          crawledOk++;
          break;
        case 'failed':
          failed++;
          break;
        case 'skipped_robots':
          skippedRobots++;
          break;
        case 'skipped_non_html':
          skippedNonHtml++;
          break;
        case 'not_crawled_limit':
          notCrawledLimit++;
          break;
        case 'redirected':
          redirected++;
          break;
        default:
          warnings.push(`Unknown ledger terminal state: ${(entry as any).state} for ${entry.url}`);
          break;
      }
    }

    const discovered = this.entries.size;
    const terminalSum =
      crawledOk + failed + skippedRobots + skippedNonHtml + notCrawledLimit + redirected;

    const isReconciled = discovered === terminalSum;
    if (!isReconciled) {
      warnings.push(
        `Ledger reconciliation mismatch: discovered (${discovered}) !== sum of terminal states (${terminalSum}).`
      );
    }

    return {
      discovered,
      crawledOk,
      failed,
      skippedRobots,
      skippedNonHtml,
      notCrawledLimit,
      redirected,
      isReconciled,
      integrityWarnings: warnings,
    };
  }

  /**
   * Strict invariant verification across the entire audit pipeline.
   * Hard-fails in development / testing, returns structured DataIntegrityReport in production.
   */
  public verifyInvariants(
    totalPagesAnalyzed: number,
    totalFindingsSum: number,
    totalFindingsLength: number
  ): DataIntegrityReport {
    const summary = this.reconcile();
    const warnings: string[] = [...summary.integrityWarnings];

    const discoveredEqualsSum = summary.isReconciled;
    const allRowsEqualDiscovered = this.entries.size === summary.discovered;
    const successfulRowsEqualCrawledOk = this.getCrawledOkPages().length === summary.crawledOk;
    const analyzedPagesEqualCrawledOk = totalPagesAnalyzed === summary.crawledOk;
    const findingsCategorySumEqualsTotal = totalFindingsSum === totalFindingsLength;

    if (!discoveredEqualsSum) {
      warnings.push(`Invariant broken: discovered != sum of terminal buckets.`);
    }
    if (!allRowsEqualDiscovered) {
      warnings.push(`Invariant broken: rows in ledger (${this.entries.size}) != discovered (${summary.discovered}).`);
    }
    if (!successfulRowsEqualCrawledOk) {
      warnings.push(`Invariant broken: crawled_ok pages extracted != ledger crawled_ok count.`);
    }
    if (!analyzedPagesEqualCrawledOk) {
      warnings.push(
        `Invariant broken: analyzed pages (${totalPagesAnalyzed}) != crawled_ok count (${summary.crawledOk}).`
      );
    }
    if (!findingsCategorySumEqualsTotal) {
      warnings.push(
        `Invariant broken: sum of category findings (${totalFindingsSum}) != total findings length (${totalFindingsLength}).`
      );
    }

    const isValid =
      discoveredEqualsSum &&
      allRowsEqualDiscovered &&
      successfulRowsEqualCrawledOk &&
      analyzedPagesEqualCrawledOk &&
      findingsCategorySumEqualsTotal;

    return {
      isValid,
      ledgerSummary: summary,
      invariants: {
        discoveredEqualsSum,
        allRowsEqualDiscovered,
        successfulRowsEqualCrawledOk,
        analyzedPagesEqualCrawledOk,
        findingsCategorySumEqualsTotal,
      },
      warnings,
    };
  }

  public toIntegrityReport(
    totalFindingsLength: number,
    totalFindingsSum: number
  ): DataIntegrityReport {
    return this.verifyInvariants(
      this.reconcile().crawledOk,
      totalFindingsSum,
      totalFindingsLength
    );
  }

  public toJSON(): LedgerEntry[] {
    return this.getAllEntries();
  }
}
