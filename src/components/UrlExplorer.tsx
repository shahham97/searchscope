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
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ExtractedPageData, CrawlStatistics, FailureCode } from '../types/audit';

interface UrlExplorerProps {
  pages: ExtractedPageData[];
  crawlStats?: CrawlStatistics;
}

export const UrlExplorer: React.FC<UrlExplorerProps> = ({ pages, crawlStats }) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'success' | 'failed' | 'uncrawled'>('all');
  const [selectedPage, setSelectedPage] = useState<ExtractedPageData | null>(null);

  const uncrawledUrls = crawlStats?.uncrawledUrls || [];

  const successfulPages = pages.filter((p) => p.statusCode >= 200 && p.statusCode < 300 && !p.failureCode);
  const failedPages = pages.filter((p) => p.failureCode || p.statusCode >= 400 || p.statusCode === 0);

  const filteredPages = pages.filter((p) => {
    if (filterTab === 'success' && (p.statusCode < 200 || p.statusCode >= 300 || p.failureCode)) return false;
    if (filterTab === 'failed' && !p.failureCode && p.statusCode >= 200 && p.statusCode < 400) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.url.toLowerCase().includes(q) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.failureCode && p.failureCode.toLowerCase().includes(q))
    );
  });

  const filteredUncrawled = uncrawledUrls.filter((u) => {
    if (!search.trim()) return true;
    return u.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusBadge = (page: ExtractedPageData) => {
    if (page.failureCode) {
      return (
        <Badge variant="critical">
          {page.failureCode}
        </Badge>
      );
    }
    if (page.statusCode >= 200 && page.statusCode < 300) {
      return <Badge variant="success">HTTP {page.statusCode}</Badge>;
    }
    if (page.statusCode >= 300 && page.statusCode < 400) {
      return <Badge variant="informational">HTTP {page.statusCode}</Badge>;
    }
    if (page.statusCode >= 400 && page.statusCode < 500) {
      return <Badge variant="high">HTTP {page.statusCode}</Badge>;
    }
    return <Badge variant="critical">HTTP {page.statusCode || 'Error'}</Badge>;
  };

  return (
    <div className="space-y-6">
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
              All Crawled ({pages.length})
            </button>
            <button
              onClick={() => setFilterTab('success')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'success'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Successful ({successfulPages.length})
            </button>
            <button
              onClick={() => setFilterTab('failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'failed'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Failed / Blocked ({failedPages.length})
            </button>
            {uncrawledUrls.length > 0 && (
              <button
                onClick={() => setFilterTab('uncrawled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === 'uncrawled'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Not Crawled (Limit Reached: {uncrawledUrls.length})
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
              {filterTab === 'uncrawled'
                ? `Showing ${filteredUncrawled.length} of ${uncrawledUrls.length} uncrawled URLs`
                : `Showing ${filteredPages.length} of ${pages.length} URLs`}
            </span>
          </div>
        </div>
      </Card>

      {/* Uncrawled Limit Reached View */}
      {filterTab === 'uncrawled' ? (
        <Card className="overflow-hidden bg-white border-slate-200 shadow-sm">
          <div className="p-4 bg-amber-50/60 border-b border-amber-200/60 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                These <strong>{uncrawledUrls.length} URLs</strong> were discovered via sitemaps or internal links but were not crawled because the audit reached its configured crawl budget/limit.
              </span>
            </div>
            <span className="font-semibold text-amber-800 shrink-0">Audit Depth Cap</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Discovered URL</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUncrawled.map((url, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="high">Uncrawled (Limit)</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-800 break-all">
                      {url}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Discovered in sitemap/links; excluded by audit page limit
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* URLs Table */
        <Card className="overflow-hidden bg-white border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">URL & Title</th>
                  <th className="px-4 py-3 text-center">Words</th>
                  <th className="px-4 py-3 text-center">Response</th>
                  <th className="px-4 py-3 text-center">Schemas</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredPages.map((page, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(page)}</td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-semibold text-slate-900 truncate">
                        {page.title || (page.failureHint ? `Failure: ${page.failureHint}` : '(No Title Declared)')}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                        {page.url}
                      </div>
                    </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap font-medium">
                    {page.wordCount}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap text-slate-500">
                    {page.fetchDurationMs}ms
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {page.structuredData.length > 0 ? (
                      <span className="font-semibold text-indigo-600">
                        {page.structuredData.length}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPage(page)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Inspect <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* URL Detail Inspection Modal */}
      {selectedPage && (
        <Modal
          isOpen={Boolean(selectedPage)}
          onClose={() => setSelectedPage(null)}
          title={`URL Inspection: ${selectedPage.url}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Failure callout if present */}
            {selectedPage.failureCode && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <div className="font-bold flex items-center mb-1">
                  <AlertTriangle className="h-4 w-4 mr-1 text-rose-600" />
                  Diagnostic Code: {selectedPage.failureCode}
                </div>
                <p className="text-xs">{selectedPage.failureHint || selectedPage.error}</p>
              </div>
            )}

            {/* Metadata Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">HTTP Status:</span>
                <span>{getStatusBadge(selectedPage)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Page Title:</span>{' '}
                <span>
                  {selectedPage.title || 'None'} ({selectedPage.titleLength} chars)
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Meta Description:</span>{' '}
                <span>
                  {selectedPage.metaDescription || 'None'} ({selectedPage.metaDescriptionLength} chars)
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Canonical Tag:</span>{' '}
                <span className="font-mono">{selectedPage.canonicalUrl || 'Not Declared'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Robots Directives:</span>{' '}
                <span>
                  {selectedPage.robotsDirectives.length > 0
                    ? selectedPage.robotsDirectives.join(', ')
                    : 'Default (index, follow)'}
                </span>
              </div>
            </div>

            {/* Rendered vs Raw HTML Comparison if available */}
            {selectedPage.rawVsRenderedDiff && (
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200">
                <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-[11px] mb-2 flex items-center">
                  <Code2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                  Headless Rendering Comparison (Raw vs Rendered DOM)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Raw Words</span>
                    <strong className="text-sm">{selectedPage.rawVsRenderedDiff.rawWordCount}</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Rendered Words</span>
                    <strong className="text-sm text-indigo-600">
                      {selectedPage.rawVsRenderedDiff.renderedWordCount}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Difference</span>
                    <strong
                      className={`text-sm ${
                        selectedPage.rawVsRenderedDiff.wordCountDiff > 0 ? 'text-emerald-600' : 'text-slate-600'
                      }`}
                    >
                      +{selectedPage.rawVsRenderedDiff.wordCountDiff}
                    </strong>
                  </div>
                </div>
                {selectedPage.rawVsRenderedDiff.dependsOnJs && (
                  <p className="mt-2 text-[11px] text-amber-800 font-medium">
                    ⚠️ Content heavily depends on client-side JavaScript execution. Search bots without JS execution may index thin copy.
                  </p>
                )}
              </div>
            )}

            {/* Headings Structure */}
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                Headings Structure
              </h4>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                <div>
                  <strong className="text-indigo-600">H1:</strong>{' '}
                  {selectedPage.h1s.length > 0 ? (
                    selectedPage.h1s.join(' • ')
                  ) : (
                    <span className="text-rose-600">Missing H1</span>
                  )}
                </div>
                <div>
                  <strong className="text-slate-600">H2 ({selectedPage.h2s.length}):</strong>{' '}
                  {selectedPage.h2s.slice(0, 5).join(' • ')}
                  {selectedPage.h2s.length > 5 ? '...' : ''}
                </div>
              </div>
            </div>

            {/* Structured Data Schemas */}
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center">
                <FileCode className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                Structured Data Schemas ({selectedPage.structuredData.length})
              </h4>
              {selectedPage.structuredData.length === 0 ? (
                <p className="text-slate-500 italic">No JSON-LD structured data detected on this URL.</p>
              ) : (
                <div className="space-y-2">
                  {selectedPage.structuredData.map((sd, i) => (
                    <div key={i} className="p-3 bg-slate-900 text-slate-100 rounded-xl">
                      <div className="flex justify-between items-center text-[11px] text-indigo-300 font-semibold mb-1">
                        <span>Schema Type: {sd.type}</span>
                        <span>{sd.isValid ? 'Valid Syntax' : 'Syntax Error'}</span>
                      </div>
                      <pre className="text-[10px] font-mono overflow-x-auto max-h-32">
                        <code>{sd.rawJson}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links and Images counts */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <strong className="text-slate-900">Internal Links:</strong> {selectedPage.internalLinks.length}
                <br />
                <strong className="text-slate-900">External Links:</strong> {selectedPage.externalLinks.length}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <strong className="text-slate-900">Images:</strong> {selectedPage.images.length}
                <br />
                <strong className="text-slate-900">Missing Alt:</strong>{' '}
                {selectedPage.images.filter((i) => !i.hasAlt).length}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
