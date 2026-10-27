import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  FileCode,
  CheckCircle,
  XCircle,
  Info,
  ChevronRight,
  Layers,
  AlertTriangle,
  Code2,
  Clock,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  ExtractedPageData,
  CrawlStatistics,
  FailureCode,
  LedgerEntry,
  DataIntegrityReport,
} from '../types/audit';

interface UrlExplorerProps {
  pages: ExtractedPageData[];
  crawlStats?: CrawlStatistics;
  ledgerEntries?: LedgerEntry[];
  dataIntegrity?: DataIntegrityReport;
  samplingDistribution?: string;
}

export const UrlExplorer: React.FC<UrlExplorerProps> = ({
  pages,
  crawlStats,
  ledgerEntries = [],
  dataIntegrity,
  samplingDistribution,
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'success' | 'failed' | 'excluded' | 'uncrawled'
  >('all');
  const [selectedPage, setSelectedPage] = useState<ExtractedPageData | null>(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<LedgerEntry | null>(null);

  // If ledgerEntries exists, it's our canonical discovered source
  const hasLedger = ledgerEntries && ledgerEntries.length > 0;

  const totalDiscovered = hasLedger
    ? ledgerEntries.length
    : crawlStats?.totalPagesDiscovered || pages.length;

  const successfulEntries: LedgerEntry[] = hasLedger
    ? ledgerEntries.filter((e) => e.state === 'crawled_ok')
    : pages
        .filter((p) => p.statusCode >= 200 && p.statusCode < 300 && !p.failureCode)
        .map((p) => ({
          url: p.url,
          normalizedUrl: p.normalizedUrl,
          state: 'crawled_ok' as const,
          statusCode: p.statusCode,
          depth: 0,
          pageData: p,
          timestamp: new Date().toISOString(),
        }));

  const failedEntries: LedgerEntry[] = hasLedger
    ? ledgerEntries.filter((e) => e.state === 'failed')
    : pages
        .filter((p) => p.failureCode || p.statusCode >= 400 || p.statusCode === 0)
        .map((p) => ({
          url: p.url,
          normalizedUrl: p.normalizedUrl,
          state: 'failed' as const,
          statusCode: p.statusCode,
          depth: 0,
          failureCode: p.failureCode,
          failureHint: p.failureHint,
          pageData: p,
          timestamp: new Date().toISOString(),
        }));

  const excludedEntries: LedgerEntry[] = hasLedger
    ? ledgerEntries.filter(
        (e) =>
          e.state === 'skipped_robots' ||
          e.state === 'skipped_non_html' ||
          e.state === 'redirected'
      )
    : [];

  const uncrawledEntries: LedgerEntry[] = hasLedger
    ? ledgerEntries.filter((e) => e.state === 'not_crawled_limit')
    : (crawlStats?.uncrawledUrls || []).map((u) => ({
        url: u,
        normalizedUrl: u,
        state: 'not_crawled_limit' as const,
        depth: 1,
        timestamp: new Date().toISOString(),
      }));

  // Build the list of active entries based on selected tab
  const getTabEntries = (): LedgerEntry[] => {
    if (filterTab === 'success') return successfulEntries;
    if (filterTab === 'failed') return failedEntries;
    if (filterTab === 'excluded') return excludedEntries;
    if (filterTab === 'uncrawled') return uncrawledEntries;
    // 'all': return all ledger entries if available, otherwise synthesize from pages and uncrawled
    if (hasLedger) return ledgerEntries;
    return [
      ...pages.map((p) => ({
        url: p.url,
        normalizedUrl: p.normalizedUrl,
        state: (p.failureCode || p.statusCode >= 400 || p.statusCode === 0
          ? 'failed'
          : 'crawled_ok') as any,
        statusCode: p.statusCode,
        depth: 0,
        failureCode: p.failureCode,
        failureHint: p.failureHint,
        pageData: p,
        timestamp: new Date().toISOString(),
      })),
      ...uncrawledEntries,
    ];
  };

  const activeEntries = getTabEntries();

  const filteredEntries = activeEntries.filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const p = entry.pageData;
    return (
      entry.url.toLowerCase().includes(q) ||
      (p?.title && p.title.toLowerCase().includes(q)) ||
      (entry.failureCode && entry.failureCode.toLowerCase().includes(q)) ||
      (entry.failureHint && entry.failureHint.toLowerCase().includes(q)) ||
      (entry.pageType && entry.pageType.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (entry: LedgerEntry) => {
    if (entry.state === 'crawled_ok') {
      return <Badge variant="success">HTTP {entry.statusCode || 200}</Badge>;
    }
    if (entry.state === 'failed') {
      return (
        <Badge variant="critical">
          {entry.failureCode || `HTTP ${entry.statusCode || 'ERR'}`}
        </Badge>
      );
    }
    if (entry.state === 'skipped_robots') {
      return <Badge variant="high">Robots Blocked</Badge>;
    }
    if (entry.state === 'skipped_non_html') {
      return <Badge variant="informational">Non-HTML</Badge>;
    }
    if (entry.state === 'redirected') {
      return <Badge variant="informational">Redirected</Badge>;
    }
    return <Badge variant="medium">Uncrawled (Limit)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Sampling and Integrity Banner */}
      {samplingDistribution && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-medium">{samplingDistribution}</span>
          </div>
          <span className="text-[11px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
            Stratified Sampling
          </span>
        </div>
      )}

      {dataIntegrity?.isValid && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Result Ledger Reconciled:</strong> 100% Invariants Verified across Discovered,
              Crawled, Skipped, and Findings.
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700">
            {totalDiscovered} Discovered = {successfulEntries.length} OK + {failedEntries.length} Fail +{' '}
            {excludedEntries.length} Policy + {uncrawledEntries.length} Limit
          </span>
        </div>
      )}

      {/* Filter Tabs & Search Header */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Discovered ({totalDiscovered})
            </button>
            <button
              onClick={() => setFilterTab('success')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'success'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Successful ({successfulEntries.length})
            </button>
            <button
              onClick={() => setFilterTab('failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'failed'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Failed ({failedEntries.length})
            </button>
            {excludedEntries.length > 0 && (
              <button
                onClick={() => setFilterTab('excluded')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === 'excluded'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                Excluded / Policy ({excludedEntries.length})
              </button>
            )}
            {uncrawledEntries.length > 0 && (
              <button
                onClick={() => setFilterTab('uncrawled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === 'uncrawled'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Not Crawled (Limit: {uncrawledEntries.length})
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search URLs, page titles, or errors..."
                className="text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-2 w-full placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredEntries.length} of {activeEntries.length} items
            </span>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden bg-white border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Discovered URL & Title</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Words</th>
                <th className="px-4 py-3 text-center">Response</th>
                <th className="px-4 py-3 text-center">Schemas</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredEntries.map((entry, idx) => {
                const p = entry.pageData;
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(entry)}</td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-semibold text-slate-900 truncate">
                        {p?.title ||
                          (entry.failureHint
                            ? `Failure: ${entry.failureHint}`
                            : entry.state === 'not_crawled_limit'
                            ? '(Discovered via sitemap/links - Uncrawled Limit)'
                            : '(No Title Declared)')}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                        {entry.url}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {entry.pageType || p?.pageType || 'utility'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap font-medium">
                      {p?.wordCount ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-slate-500">
                      {p?.fetchDurationMs ? `${p.fetchDurationMs}ms` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {p && p.structuredData?.length > 0 ? (
                        <span className="font-semibold text-indigo-600">
                          {p.structuredData.length}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPage(p)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Inspect <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLedgerEntry(entry)}
                          className="text-xs text-slate-600 hover:text-slate-800"
                        >
                          Details <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspected Page Modal */}
      {selectedPage && (
        <Modal
          isOpen={Boolean(selectedPage)}
          onClose={() => setSelectedPage(null)}
          title="URL Technical Inspection"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs text-indigo-600 break-all font-semibold">
                  {selectedPage.url}
                </span>
                {getStatusBadge({
                  url: selectedPage.url,
                  normalizedUrl: selectedPage.normalizedUrl,
                  depth: 0,
                  state: selectedPage.failureCode ? 'failed' : 'crawled_ok',
                  statusCode: selectedPage.statusCode,
                  failureCode: selectedPage.failureCode,
                  timestamp: '',
                })}
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {selectedPage.title || '(No Title Declared)'}
              </div>
              {selectedPage.metaDescription && (
                <p className="text-xs text-slate-600">{selectedPage.metaDescription}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Word Count</span>
                <span className="text-lg font-bold text-slate-900">{selectedPage.wordCount}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Fetch Duration</span>
                <span className="text-lg font-bold text-slate-900">
                  {selectedPage.fetchDurationMs}ms
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Internal Links</span>
                <span className="text-lg font-bold text-slate-900">
                  {selectedPage.internalLinks.length}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Schemas</span>
                <span className="text-lg font-bold text-indigo-600">
                  {selectedPage.structuredData.length}
                </span>
              </div>
            </div>

            {/* Headings */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Heading Structure
              </h4>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
                {selectedPage.h1s.length > 0 ? (
                  selectedPage.h1s.map((h, i) => (
                    <div key={i} className="text-indigo-900">
                      <strong>H1:</strong> {h}
                    </div>
                  ))
                ) : (
                  <div className="text-rose-600">Missing H1 Heading</div>
                )}
                {selectedPage.h2s.slice(0, 5).map((h, i) => (
                  <div key={i} className="text-slate-700 pl-3">
                    <strong>H2:</strong> {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Schemas */}
            {selectedPage.structuredData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detected Schemas (JSON-LD)
                </h4>
                <div className="space-y-2">
                  {selectedPage.structuredData.map((sd, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto"
                    >
                      <div className="text-emerald-400 font-bold mb-1">Type: {sd.type}</div>
                      <pre>{sd.rawJson}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Ledger Entry Details Modal */}
      {selectedLedgerEntry && (
        <Modal
          isOpen={Boolean(selectedLedgerEntry)}
          onClose={() => setSelectedLedgerEntry(null)}
          title="Discovered URL Ledger Record"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-mono text-slate-800 break-all">{selectedLedgerEntry.url}</div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedLedgerEntry)}
                <span className="font-mono text-slate-500">
                  Depth: {selectedLedgerEntry.depth}
                </span>
                {selectedLedgerEntry.pageType && (
                  <span className="font-mono text-slate-500 uppercase">
                    Type: {selectedLedgerEntry.pageType}
                  </span>
                )}
              </div>
            </div>

            {selectedLedgerEntry.failureHint && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                <strong>Failure Detail:</strong> {selectedLedgerEntry.failureHint}
              </div>
            )}

            {selectedLedgerEntry.discoveredFrom && (
              <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg">
                <strong>Discovered From:</strong>{' '}
                <span className="font-mono">{selectedLedgerEntry.discoveredFrom}</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
