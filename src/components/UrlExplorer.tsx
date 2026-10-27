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
  const [sortBy, setSortBy] = useState<'default' | 'health_asc' | 'health_desc'>('default');
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

  let activeEntries: LedgerEntry[] = [];
  if (filterTab === 'all') {
    activeEntries = hasLedger
      ? ledgerEntries
      : [...successfulEntries, ...failedEntries, ...uncrawledEntries];
  } else if (filterTab === 'success') {
    activeEntries = successfulEntries;
  } else if (filterTab === 'failed') {
    activeEntries = failedEntries;
  } else if (filterTab === 'excluded') {
    activeEntries = excludedEntries;
  } else if (filterTab === 'uncrawled') {
    activeEntries = uncrawledEntries;
  }

  const filteredEntries = activeEntries.filter((entry) => {
    const q = search.toLowerCase();
    const urlMatch = entry.url.toLowerCase().includes(q);
    const titleMatch = entry.pageData?.title?.toLowerCase().includes(q) || false;
    const errorMatch =
      entry.failureHint?.toLowerCase().includes(q) ||
      entry.failureCode?.toLowerCase().includes(q) ||
      false;
    return urlMatch || titleMatch || errorMatch;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortBy === 'health_asc') {
      const scoreA = a.pageData?.pageHealthScore ?? (a.state === 'failed' ? -1 : 101);
      const scoreB = b.pageData?.pageHealthScore ?? (b.state === 'failed' ? -1 : 101);
      return scoreA - scoreB;
    }
    if (sortBy === 'health_desc') {
      const scoreA = a.pageData?.pageHealthScore ?? (a.state === 'failed' ? -1 : 0);
      const scoreB = b.pageData?.pageHealthScore ?? (b.state === 'failed' ? -1 : 0);
      return scoreB - scoreA;
    }
    return 0;
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
        <div className="bg-jet-900 border border-cerulean/30 text-cerulean-300 px-4 py-3 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-glow-cerulean">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cerulean shrink-0" />
            <span className="font-medium text-white">{samplingDistribution}</span>
          </div>
          <span className="text-[11px] font-mono text-cerulean bg-cerulean/10 border border-cerulean/30 px-2.5 py-0.5 rounded shrink-0">
            Stratified Sampling
          </span>
        </div>
      )}

      {dataIntegrity?.isValid && (
        <div className="bg-jet-900 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">Result Ledger Reconciled:</strong> 100% Invariants Verified across Discovered,
              Crawled, Skipped, and Findings.
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded break-all shrink-0">
            {totalDiscovered} Discovered = {successfulEntries.length} OK + {failedEntries.length} Fail +{' '}
            {excludedEntries.length} Policy + {uncrawledEntries.length} Limit
          </span>
        </div>
      )}

      {/* Filter Tabs & Search Header */}
      <Card className="p-3.5 sm:p-4 bg-jet-900 border-jet-800">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap -mx-1 px-1 sm:mx-0 sm:px-0 custom-scrollbar border-b border-jet-800 pb-3">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
                filterTab === 'all'
                  ? 'bg-cerulean text-jet-950 shadow-glow-cerulean font-bold'
                  : 'bg-jet-800 text-slate-300 hover:bg-jet-700 hover:text-white'
              }`}
            >
              All Discovered ({totalDiscovered})
            </button>
            <button
              onClick={() => setFilterTab('success')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
                filterTab === 'success'
                  ? 'bg-emerald-500 text-jet-950 font-bold'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
              }`}
            >
              Successful ({successfulEntries.length})
            </button>
            <button
              onClick={() => setFilterTab('failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
                filterTab === 'failed'
                  ? 'bg-neon text-white font-bold shadow-glow-rose'
                  : 'bg-rose-950/40 text-neon border border-neon/30 hover:bg-rose-900/60'
              }`}
            >
              Failed ({failedEntries.length})
            </button>
            {excludedEntries.length > 0 && (
              <button
                onClick={() => setFilterTab('excluded')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
                  filterTab === 'excluded'
                    ? 'bg-cerulean-600 text-white font-bold'
                    : 'bg-jet-800 text-slate-300 hover:bg-jet-700'
                }`}
              >
                Excluded / Policy ({excludedEntries.length})
              </button>
            )}
            {uncrawledEntries.length > 0 && (
              <button
                onClick={() => setFilterTab('uncrawled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
                  filterTab === 'uncrawled'
                    ? 'bg-amber-500 text-jet-950 font-bold'
                    : 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60'
                }`}
              >
                Not Crawled (Limit: {uncrawledEntries.length})
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search URLs, page titles, or errors..."
                  className="text-xs bg-jet-950 border border-jet-700 rounded-lg pl-9 pr-3 py-2 w-full text-white placeholder:text-slate-500 focus:outline-none focus:border-cerulean focus:ring-1 focus:ring-cerulean min-h-[40px]"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs border border-jet-700 rounded-lg px-2.5 py-2 bg-jet-950 text-slate-200 focus:outline-none focus:border-cerulean focus:ring-1 focus:ring-cerulean min-h-[40px]"
              >
                <option value="default">Default Order</option>
                <option value="health_asc">Worst Health First</option>
                <option value="health_desc">Best Health First</option>
              </select>
            </div>
            <span className="text-xs text-slate-400 font-mono text-center sm:text-right">
              Showing {sortedEntries.length} of {activeEntries.length} items
            </span>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden bg-jet-900 border-jet-800 shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-jet-800 text-left text-xs">
            <thead className="bg-jet-950/80 text-slate-400 font-rajdhani font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Discovered URL & Title</th>
                <th className="px-4 py-3 text-center">Health</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Words</th>
                <th className="px-4 py-3 text-center">Response</th>
                <th className="px-4 py-3 text-center">Schemas</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jet-800/60 font-normal text-slate-300">
              {sortedEntries.map((entry, idx) => {
                const p = entry.pageData;
                return (
                  <tr key={idx} className="hover:bg-jet-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(entry)}</td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-medium text-white truncate">
                        {p?.title ||
                          (entry.failureHint
                            ? `Failure: ${entry.failureHint}`
                            : entry.state === 'not_crawled_limit'
                            ? '(Discovered via sitemap/links - Uncrawled Limit)'
                            : '(No Title Declared)')}
                      </div>
                      <div className="text-[11px] font-mono text-cerulean/80 truncate mt-0.5">
                        {entry.url}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {p?.pageHealthScore !== undefined ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                            p.pageHealthScore >= 80
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                              : p.pageHealthScore >= 50
                              ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                              : 'bg-rose-950/60 text-neon border-neon/40'
                          }`}
                        >
                          {p.pageHealthScore}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-jet-950 text-slate-300 border border-jet-800">
                        {entry.pageType || p?.pageType || 'utility'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap font-medium text-slate-200">
                      {p?.wordCount ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-slate-400 font-mono">
                      {p?.fetchDurationMs ? `${p.fetchDurationMs}ms` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {p && p.structuredData?.length > 0 ? (
                        <span className="font-semibold text-cerulean">
                          {p.structuredData.length}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPage(p)}
                          className="text-xs text-cerulean hover:text-white hover:bg-cerulean/20"
                        >
                          Inspect <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLedgerEntry(entry)}
                          className="text-xs text-slate-400 hover:text-white hover:bg-jet-800"
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
            <div className="p-4 bg-jet-950 rounded-xl space-y-2 border border-jet-800">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs text-cerulean break-all font-semibold">
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
              <div className="text-sm font-semibold text-white">
                {selectedPage.title || '(No Title Declared)'}
              </div>
              {selectedPage.metaDescription && (
                <p className="text-xs text-slate-300 leading-relaxed">{selectedPage.metaDescription}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-jet-950 border border-jet-800 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Word Count</span>
                <span className="text-lg font-bold text-white font-mono">{selectedPage.wordCount}</span>
              </div>
              <div className="p-3 bg-jet-950 border border-jet-800 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Fetch Duration</span>
                <span className="text-lg font-bold text-white font-mono">
                  {selectedPage.fetchDurationMs}ms
                </span>
              </div>
              <div className="p-3 bg-jet-950 border border-jet-800 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Internal Links</span>
                <span className="text-lg font-bold text-white font-mono">
                  {selectedPage.internalLinks.length}
                </span>
              </div>
              <div className="p-3 bg-jet-950 border border-jet-800 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Schemas</span>
                <span className="text-lg font-bold text-cerulean font-mono">
                  {selectedPage.structuredData.length}
                </span>
              </div>
            </div>

            {/* Headings */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-rajdhani">
                Heading Structure
              </h4>
              <div className="p-3 bg-jet-950 border border-jet-800 rounded-lg space-y-2 max-h-48 overflow-y-auto font-mono text-xs custom-scrollbar">
                {selectedPage.h1s.length > 0 ? (
                  selectedPage.h1s.map((h, i) => (
                    <div key={i} className="text-cerulean">
                      <strong className="text-white">H1:</strong> {h}
                    </div>
                  ))
                ) : (
                  <div className="text-neon">Missing H1 Heading</div>
                )}
                {selectedPage.h2s.slice(0, 5).map((h, i) => (
                  <div key={i} className="text-slate-300 pl-3">
                    <strong className="text-slate-400">H2:</strong> {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Schemas */}
            {selectedPage.structuredData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-rajdhani">
                  Detected Schemas (JSON-LD)
                </h4>
                <div className="space-y-2">
                  {selectedPage.structuredData.map((sd, i) => (
                    <div
                      key={i}
                      className="p-3 bg-jet-950 text-slate-200 border border-jet-800 rounded-lg font-mono text-[11px] overflow-x-auto custom-scrollbar"
                    >
                      <div className="text-emerald-400 font-bold mb-1">Type: {sd.type}</div>
                      <pre className="text-slate-300">{sd.rawJson}</pre>
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
            <div className="p-4 bg-jet-950 border border-jet-800 rounded-xl space-y-2">
              <div className="font-mono text-cerulean break-all">{selectedLedgerEntry.url}</div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedLedgerEntry)}
                <span className="font-mono text-slate-400">
                  Depth: {selectedLedgerEntry.depth}
                </span>
                {selectedLedgerEntry.pageType && (
                  <span className="font-mono text-slate-300 uppercase">
                    Type: {selectedLedgerEntry.pageType}
                  </span>
                )}
              </div>
            </div>

            {selectedLedgerEntry.failureHint && (
              <div className="p-3 bg-rose-950/40 border border-neon/40 text-neon rounded-lg font-mono">
                <strong>Failure Detail:</strong> {selectedLedgerEntry.failureHint}
              </div>
            )}

            {selectedLedgerEntry.discoveredFrom && (
              <div className="p-3 bg-jet-950 border border-jet-800 text-slate-300 rounded-lg">
                <strong className="text-white">Discovered From:</strong>{' '}
                <span className="font-mono text-cerulean">{selectedLedgerEntry.discoveredFrom}</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
