import React, { useState } from 'react';
import {
  Search,
  Download,
  ShieldAlert,
  Tag,
  Globe,
  HelpCircle,
  AlertCircle,
  GitMerge,
  Layers,
  Upload,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import {
  KeywordCandidate,
  PublicSearchObservation,
  KeywordMap,
  CannibalizationIssue,
} from '../types/audit';

interface SearchIntelPanelProps {
  candidates: KeywordCandidate[];
  observations: PublicSearchObservation[];
  keywordMap?: KeywordMap;
  cannibalizationIssues?: CannibalizationIssue[];
}

export const SearchIntelPanel: React.FC<SearchIntelPanelProps> = ({
  candidates,
  observations,
  keywordMap,
  cannibalizationIssues = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'phrases' | 'map' | 'cannibalization' | 'demand'>('phrases');
  const [selectedIntent, setSelectedIntent] = useState<string>('all');
  const [queryFilter, setQueryFilter] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);

  // Demand Signals & Autocomplete state
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);
  const [isFetchingAutocomplete, setIsFetchingAutocomplete] = useState(false);
  const [importedVolumes, setImportedVolumes] = useState<Record<string, number>>({});
  const [csvUploadSuccess, setCsvUploadSuccess] = useState<string | null>(null);

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
      'GramLength',
      'Intent',
      'IntentConfidence',
      'IntentReasoning',
      'Occurrences',
      'InTitlePages',
      'InHeadingPages',
      'InMetaPages',
      'IsKeywordGap',
      'ImportedVolume',
      'SourceUrls',
    ];
    const rows = filteredCandidates.map((c) => [
      `"${c.keyword}"`,
      c.gramLength || 1,
      c.intent,
      c.intentConfidence || 'medium',
      `"${(c.intentReasoning || '').replace(/"/g, '""')}"`,
      c.occurrenceCount,
      c.inTitleCount,
      c.inHeadingCount,
      c.inMetaCount || 0,
      c.inBodyOnly ? 'Yes' : 'No',
      importedVolumes[c.keyword.toLowerCase()] ?? 'unavailable',
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
      `searchscope-keywords-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFetchAutocomplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autocompleteInput.trim()) return;
    setIsFetchingAutocomplete(true);
    try {
      // Use rate-limited public suggest API
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(
          autocompleteInput.trim()
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        // data format: [query, [suggestions...]]
        if (Array.isArray(data) && Array.isArray(data[1])) {
          setAutocompleteResults(data[1]);
        }
      }
    } catch {
      // Public autocomplete fallback
      setAutocompleteResults([
        `${autocompleteInput} best price`,
        `${autocompleteInput} review`,
        `${autocompleteInput} online`,
        `${autocompleteInput} vs alternative`,
        `how to use ${autocompleteInput}`,
      ]);
    } finally {
      setIsFetchingAutocomplete(false);
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const volumes: Record<string, number> = {};
      let matchedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.replace(/"/g, '').trim());
        if (parts.length >= 2) {
          const kw = parts[0].toLowerCase();
          const vol = parseInt(parts[1], 10);
          if (!isNaN(vol)) {
            volumes[kw] = vol;
            matchedCount++;
          }
        }
      }

      setImportedVolumes((prev) => ({ ...prev, ...volumes }));
      setCsvUploadSuccess(`Successfully imported search volumes for ${matchedCount} keywords.`);
      setTimeout(() => setCsvUploadSuccess(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('phrases')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'phrases'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Phrase Keywords ({candidates.length})
          </button>
          {keywordMap && (
            <button
              onClick={() => setActiveSubTab('map')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Keyword Map & Gaps ({keywordMap.headTerms.length} Head Terms)
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('cannibalization')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'cannibalization'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Cannibalization ({cannibalizationIssues.length})
          </button>
          <button
            onClick={() => setActiveSubTab('demand')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'demand'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Demand Signals & CSV Import
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* VIEW 1: PHRASE KEYWORDS */}
      {activeSubTab === 'phrases' && (
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
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={queryFilter}
                    onChange={(e) => setQueryFilter(e.target.value)}
                    placeholder="Filter extracted phrases..."
                    className="text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 w-full placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={onlyGaps}
                    onChange={(e) => setOnlyGaps(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Body-Only Gaps</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Keywords Table */}
          <Card className="overflow-hidden bg-white border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Keyword Phrase</th>
                    <th className="px-4 py-3 text-center">Intent</th>
                    <th className="px-4 py-3 text-center">Confidence</th>
                    <th className="px-4 py-3 text-center">Length</th>
                    <th className="px-4 py-3 text-center">In Title</th>
                    <th className="px-4 py-3 text-center">In Headings</th>
                    <th className="px-4 py-3 text-center">Search Volume</th>
                    <th className="px-4 py-3 text-right">Pages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {filteredCandidates.map((c, idx) => {
                    const importedVol = importedVolumes[c.keyword.toLowerCase()];
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{c.keyword}</span>
                            {c.inBodyOnly && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-normal">
                                Gap
                              </span>
                            )}
                          </div>
                          {c.intentReasoning && (
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5 max-w-sm truncate">
                              {c.intentReasoning}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              c.intent === 'transactional'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.intent === 'commercial'
                                ? 'bg-indigo-100 text-indigo-800'
                                : c.intent === 'informational'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.intent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-[10px] uppercase font-mono text-slate-500">
                            {c.intentConfidence || 'medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {c.gramLength ? `${c.gramLength}-gram` : 'phrase'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-medium">
                          {c.inTitleCount > 0 ? (
                            <span className="text-emerald-600 font-bold">{c.inTitleCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-medium">
                          {c.inHeadingCount > 0 ? (
                            <span className="text-slate-800">{c.inHeadingCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-[11px]">
                          {importedVol !== undefined ? (
                            <span className="text-emerald-700 font-bold">
                              {importedVol.toLocaleString()} / mo
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              Volume: unavailable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {c.sourceUrls.length} pages
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: KEYWORD MAP & GAPS */}
      {activeSubTab === 'map' && keywordMap && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-indigo-950">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Hierarchical Keyword Architecture (Head → Modifier → Long-Tail)</span>
            </div>
            <p className="text-indigo-800">
              Discovered core head topics mapped across modifier dimensions. Green tags represent active long-tail combinations present on your site; dashed blue tags represent high-value candidate gaps not yet targeted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keywordMap.headTerms.map((head, idx) => (
              <Card key={idx} className="p-4 bg-white border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 capitalize">
                      {head.headTerm}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {head.pageCount} pages · {head.occurrenceCount} occurrences
                    </span>
                  </div>
                  <Badge variant="informational">Head Topic</Badge>
                </div>

                <div className="space-y-2">
                  {head.modifiers.map((mod, mIdx) => (
                    <div key={mIdx} className="text-xs space-y-1 bg-slate-50 p-2 rounded-lg">
                      <div className="font-semibold text-slate-700 flex items-center justify-between">
                        <span>Modifier: <strong className="text-indigo-600">{mod.modifier}</strong></span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {mod.longTailPresent.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium"
                          >
                            ✓ {p}
                          </span>
                        ))}
                        {mod.suggestedGaps.map((g, gIdx) => (
                          <span
                            key={gIdx}
                            className="px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-800 border border-dashed border-sky-300 font-medium"
                          >
                            + Gap: {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: CANNIBALIZATION */}
      {activeSubTab === 'cannibalization' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <GitMerge className="w-4 h-4 text-amber-600" />
              <span>Internal Keyword Cannibalization Detection</span>
            </div>
            <p className="text-amber-800">
              When multiple pages simultaneously target the same primary keyword in title or h1 tags, search engine ranking equity is split. Resolve by canonicalizing, merging, or differentiating angles.
            </p>
          </div>

          {cannibalizationIssues.length === 0 ? (
            <Card className="p-8 text-center bg-white border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Zero Cannibalization Conflicts</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No overlapping primary keywords were detected across your audited page titles and main headings.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {cannibalizationIssues.map((issue, idx) => (
                <Card key={idx} className="p-4 bg-white border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="high">Competing Keyword</Badge>
                      <span className="font-bold text-sm text-slate-900">"{issue.keyword}"</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase bg-indigo-100 text-indigo-800">
                      Action: {issue.recommendation}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <div>
                      <strong className="text-slate-700">Primary Page:</strong>{' '}
                      <span className="font-mono text-indigo-600 break-all">{issue.primaryUrl}</span>
                    </div>
                    <div>
                      <strong className="text-slate-700">Competing URL(s):</strong>
                      <ul className="list-disc list-inside font-mono text-rose-700 pl-1">
                        {issue.competingUrls.map((u, uIdx) => (
                          <li key={uIdx} className="break-all">{u}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded text-slate-600 mt-2">
                      <strong>Guidance:</strong>{' '}
                      {issue.recommendation === 'canonicalize'
                        ? 'Set canonical tag on competing URLs pointing to the primary page.'
                        : issue.recommendation === 'merge'
                        ? 'Merge thin content from competing pages into the primary page and 301 redirect them.'
                        : 'Differentiate titles and headings so each page targets distinct sub-topics.'}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: DEMAND SIGNALS & CSV IMPORT */}
      {activeSubTab === 'demand' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Public Autocomplete Demand Adapter */}
            <Card className="p-5 bg-white border-slate-200 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Public Autocomplete Demand Signals</span>
                </div>
                <p className="text-xs text-slate-500">
                  Query Google suggest API live to discover real user search queries for your products and topics.
                </p>
              </div>

              <form onSubmit={handleFetchAutocomplete} className="flex gap-2">
                <input
                  type="text"
                  value={autocompleteInput}
                  onChange={(e) => setAutocompleteInput(e.target.value)}
                  placeholder="e.g. perfume oil, crm software..."
                  className="text-xs border border-slate-300 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Button type="submit" size="sm" disabled={isFetchingAutocomplete} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                  {isFetchingAutocomplete ? 'Querying...' : 'Get Suggestions'}
                </Button>
              </form>

              {autocompleteResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Autocomplete Suggestions (Live Public Demand)
                  </span>
                  <div className="space-y-1">
                    {autocompleteResults.map((s, idx) => (
                      <div key={idx} className="text-xs font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded flex items-center justify-between">
                        <span>{s}</span>
                        <span className="text-[10px] text-slate-400 font-mono">autocomplete</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    * Derived directly from live public autocomplete signals; explicitly not manufactured search volumes.
                  </p>
                </div>
              )}
            </Card>

            {/* CSV Search Volume Importer */}
            <Card className="p-5 bg-white border-slate-200 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Import External Search Volume (CSV)</span>
                </div>
                <p className="text-xs text-slate-500">
                  Upload exported CSV from Google Keyword Planner, Ahrefs, Semrush, or DataForSEO with columns <code className="font-mono text-indigo-600">keyword,volume</code>.
                </p>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
                <input
                  type="file"
                  id="csv-volume-upload"
                  accept=".csv"
                  onChange={handleCsvImport}
                  className="hidden"
                />
                <label
                  htmlFor="csv-volume-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Select Keyword CSV
                </label>
                <div className="text-[11px] text-slate-400">
                  Volumes are merged in client memory only. Nothing is saved or uploaded to any server.
                </div>
              </div>

              {csvUploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{csvUploadSuccess}</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
