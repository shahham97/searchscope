import React, { useState } from 'react';
import { Search, ExternalLink, FileCode, CheckCircle, XCircle, Info, ChevronRight, Layers } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ExtractedPageData } from '../types/audit';

interface UrlExplorerProps {
  pages: ExtractedPageData[];
}

export const UrlExplorer: React.FC<UrlExplorerProps> = ({ pages }) => {
  const [search, setSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<ExtractedPageData | null>(null);

  const filteredPages = pages.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.url.toLowerCase().includes(q) ||
      (p.title && p.title.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return <Badge variant="success">HTTP {statusCode}</Badge>;
    if (statusCode >= 300 && statusCode < 400) return <Badge variant="informational">HTTP {statusCode}</Badge>;
    if (statusCode >= 400 && statusCode < 500) return <Badge variant="high">HTTP {statusCode}</Badge>;
    return <Badge variant="critical">HTTP {statusCode || 'Error'}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crawled URLs or page titles..."
              className="text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-2 w-full placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-500">
            Displaying <strong>{filteredPages.length}</strong> of {pages.length} URLs
          </span>
        </div>
      </Card>

      {/* URLs Table */}
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(page.statusCode)}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="font-semibold text-slate-900 truncate">
                      {page.title || '(No Title Declared)'}
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
            {/* Metadata Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">HTTP Status:</span>
                <span>{getStatusBadge(selectedPage.statusCode)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Page Title:</span>{' '}
                <span>{selectedPage.title || 'None'} ({selectedPage.titleLength} chars)</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Meta Description:</span>{' '}
                <span>{selectedPage.metaDescription || 'None'} ({selectedPage.metaDescriptionLength} chars)</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Canonical Tag:</span>{' '}
                <span className="font-mono">{selectedPage.canonicalUrl || 'Not Declared'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Robots Directives:</span>{' '}
                <span>{selectedPage.robotsDirectives.length > 0 ? selectedPage.robotsDirectives.join(', ') : 'Default (index, follow)'}</span>
              </div>
            </div>

            {/* Headings Structure */}
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                Headings Structure
              </h4>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                <div>
                  <strong className="text-indigo-600">H1:</strong>{' '}
                  {selectedPage.h1s.length > 0 ? selectedPage.h1s.join(' • ') : <span className="text-rose-600">Missing H1</span>}
                </div>
                <div>
                  <strong className="text-slate-600">H2 ({selectedPage.h2s.length}):</strong>{' '}
                  {selectedPage.h2s.slice(0, 5).join(' • ')}{selectedPage.h2s.length > 5 ? '...' : ''}
                </div>
              </div>
            </div>

            {/* Structured Data Scripts */}
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
                <strong className="text-slate-900">Missing Alt:</strong> {selectedPage.images.filter((i) => !i.hasAlt).length}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
