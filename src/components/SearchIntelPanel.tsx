import React, { useState } from 'react';
import { Search, Download, ShieldAlert, Sparkles, Tag, Globe, HelpCircle, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { KeywordCandidate, PublicSearchObservation } from '../types/audit';

interface SearchIntelPanelProps {
  candidates: KeywordCandidate[];
  observations: PublicSearchObservation[];
}

export const SearchIntelPanel: React.FC<SearchIntelPanelProps> = ({
  candidates,
  observations,
}) => {
  const [selectedIntent, setSelectedIntent] = useState<string>('all');
  const [queryFilter, setQueryFilter] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);

  const intents = [
    { key: 'all', label: 'All Intent' },
    { key: 'informational', label: 'Informational' },
    { key: 'commercial', label: 'Commercial' },
    { key: 'transactional', label: 'Transactional' },
    { key: 'navigational', label: 'Navigational' },
    { key: 'local', label: 'Local' },
  ];

  const filteredCandidates = candidates.filter((k) => {
    if (selectedIntent !== 'all' && k.intent !== selectedIntent) return false;
    if (onlyGaps && !k.inBodyOnly) return false;
    if (queryFilter.trim() && !k.keyword.toLowerCase().includes(queryFilter.toLowerCase()))
      return false;
    return true;
  });

  const exportCsv = () => {
    const headers = [
      'Keyword',
      'Intent',
      'Occurrences',
      'InTitle',
      'InHeading',
      'InMeta',
      'IsKeywordGap',
      'TF_IDF_Score',
      'SourceUrls',
    ];
    const rows = filteredCandidates.map((c) => [
      `"${c.keyword}"`,
      c.intent,
      c.occurrenceCount,
      c.inTitleCount > 0 ? 'Yes' : 'No',
      c.inHeadingCount > 0 ? 'Yes' : 'No',
      c.inMetaCount || 0,
      c.inBodyOnly ? 'Yes' : 'No',
      c.tfIdfScore || 0,
      `"${c.sourceUrls.join('; ')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `searchscope-keyword-candidates-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Intent & Search Toolbar */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {intents.map((i) => (
              <button
                key={i.key}
                onClick={() => setSelectedIntent(i.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedIntent === i.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {i.label}
              </button>
            ))}

            <button
              onClick={() => setOnlyGaps(!onlyGaps)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                onlyGaps
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⚠️ Keyword Gaps Only
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-56">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={queryFilter}
                onChange={(e) => setQueryFilter(e.target.value)}
                placeholder="Filter keywords..."
                className="text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 w-full placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} className="shrink-0 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Keywords Table */}
      <Card className="overflow-hidden bg-white border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <Tag className="h-4 w-4 mr-1.5 text-indigo-600" />
            Candidate Keyword Intelligence (TF-IDF & Structural Extraction)
          </h3>
          <span className="text-xs text-slate-400">
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No keywords found matching the selected intent filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Keyword Candidate</th>
                  <th className="px-4 py-3 text-center">Classified Intent</th>
                  <th className="px-4 py-3 text-center">Occurrences</th>
                  <th className="px-4 py-3 text-center">In &lt;title&gt;</th>
                  <th className="px-4 py-3 text-center">In Headings</th>
                  <th className="px-4 py-3 text-center">Gap Status</th>
                  <th className="px-4 py-3 text-right">Spread Across</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredCandidates.map((cand, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {cand.keyword}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          cand.intent === 'transactional'
                            ? 'success'
                            : cand.intent === 'commercial'
                            ? 'high'
                            : 'informational'
                        }
                      >
                        {cand.intent.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {cand.occurrenceCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.inTitleCount > 0 ? (
                        <span className="text-emerald-600 font-bold">
                          Yes ({cand.inTitleCount})
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.inHeadingCount > 0 ? (
                        <span className="text-emerald-600 font-bold">
                          Yes ({cand.inHeadingCount})
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cand.inBodyOnly ? (
                        <span className="inline-flex items-center text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertCircle className="h-3 w-3 mr-1 text-amber-600" /> Gap
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Optimized</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">
                      {cand.sourceUrls.length} page{cand.sourceUrls.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Honest SERP Provenance Box */}
      <Card className="p-5 bg-slate-50 border-slate-200">
        <div className="flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <h4 className="font-bold text-slate-900">Search Engine Ranking Data Provenance</h4>
            <p>
              SearchScope extracts keywords directly from your actual crawl dataset using TF-IDF and
              structural placement weighting. We explicitly do not display synthetic search volume or CPC numbers
              without a verified third-party API connection.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
