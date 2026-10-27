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
        if (Array.isArray(data) && Array.isArray(data[1])) {
          setAutocompleteResults(data[1].slice(0, 8));
        } else {
          setAutocompleteResults([]);
        }
      }
    } catch {
      setAutocompleteResults([
        `${autocompleteInput} reviews`,
        `${autocompleteInput} price`,
        `best ${autocompleteInput}`,
        `${autocompleteInput} near me`,
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
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const map: Record<string, number> = {};
        let count = 0;
        for (const line of lines) {
          const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length >= 2) {
            const kw = parts[0].toLowerCase();
            const vol = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
            if (kw && !isNaN(vol)) {
              map[kw] = vol;
              count++;
            }
          }
        }
        setImportedVolumes((prev) => ({ ...prev, ...map }));
        setCsvUploadSuccess(`Successfully imported ${count} keyword search volumes!`);
        setTimeout(() => setCsvUploadSuccess(null), 5000);
      } catch (err) {
        console.error('Failed to parse CSV', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Search Intelligence Subtabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-jet-800 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap -mx-1 px-1 sm:mx-0 sm:px-0 custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('phrases')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
              activeSubTab === 'phrases'
                ? 'bg-cerulean text-jet-950 font-bold shadow-glow-cerulean'
                : 'bg-jet-800 text-slate-300 hover:bg-jet-700 hover:text-white'
            }`}
          >
            Extracted Phrases ({candidates.length})
          </button>
          {keywordMap && (
            <button
              onClick={() => setActiveSubTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
                activeSubTab === 'map'
                  ? 'bg-cerulean text-jet-950 font-bold shadow-glow-cerulean'
                  : 'bg-jet-800 text-slate-300 hover:bg-jet-700 hover:text-white'
              }`}
            >
              Keyword Map & Gaps ({keywordMap.headTerms.length} Head Terms)
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('cannibalization')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
              activeSubTab === 'cannibalization'
                ? 'bg-neon text-white font-bold shadow-glow-rose'
                : 'bg-rose-950/40 text-neon border border-neon/30 hover:bg-rose-900/60'
            }`}
          >
            Cannibalization ({cannibalizationIssues.length})
          </button>
          <button
            onClick={() => setActiveSubTab('demand')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-rajdhani tracking-wider transition-all shrink-0 ${
              activeSubTab === 'demand'
                ? 'bg-emerald-500 text-jet-950 font-bold'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
            }`}
          >
            Demand Signals & CSV Import
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="w-full sm:w-auto text-xs border-cerulean/40 text-cerulean hover:bg-cerulean/20 hover:text-white min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* VIEW 1: PHRASE KEYWORDS */}
      {activeSubTab === 'phrases' && (
        <div className="space-y-6">
          {/* Intent & Search Toolbar */}
          <Card className="p-3.5 sm:p-4 bg-jet-900 border-jet-800">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 custom-scrollbar">
                {intents.map((i) => (
                  <button
                    key={i.key}
                    onClick={() => setSelectedIntent(i.key)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium font-rajdhani tracking-wider transition-colors shrink-0 ${
                      selectedIntent === i.key
                        ? 'bg-cerulean text-jet-950 font-bold shadow-glow-cerulean'
                        : 'bg-jet-800 text-slate-300 hover:bg-jet-700 hover:text-white'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={queryFilter}
                    onChange={(e) => setQueryFilter(e.target.value)}
                    placeholder="Filter extracted phrases..."
                    className="text-xs bg-jet-950 border border-jet-700 rounded-lg pl-9 pr-3 py-2 w-full text-white placeholder:text-slate-500 focus:outline-none focus:border-cerulean focus:ring-1 focus:ring-cerulean min-h-[40px]"
                  />
                </div>
                <label className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-300 cursor-pointer whitespace-nowrap min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={onlyGaps}
                    onChange={(e) => setOnlyGaps(e.target.checked)}
                    className="rounded bg-jet-950 border-jet-700 text-cerulean focus:ring-cerulean"
                  />
                  <span>Body-Only Gaps</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Keywords Table */}
          <Card className="overflow-hidden bg-jet-900 border-jet-800 shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-jet-800 text-left text-xs">
                <thead className="bg-jet-950 text-slate-400 font-rajdhani font-semibold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-jet-800/60 font-normal text-slate-300">
                  {filteredCandidates.map((c, idx) => {
                    const importedVol = importedVolumes[c.keyword.toLowerCase()];
                    return (
                      <tr key={idx} className="hover:bg-jet-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{c.keyword}</span>
                            {c.inBodyOnly && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-neon border border-neon/40 font-mono">
                                Gap
                              </span>
                            )}
                          </div>
                          {c.intentReasoning && (
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5 max-w-sm truncate">
                              {c.intentReasoning}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider border ${
                              c.intent === 'transactional'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                                : c.intent === 'commercial'
                                ? 'bg-cerulean-950/60 text-cerulean border-cerulean/40'
                                : c.intent === 'informational'
                                ? 'bg-sky-950/60 text-sky-400 border-sky-500/40'
                                : 'bg-jet-800 text-slate-300 border-jet-700'
                            }`}
                          >
                            {c.intent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-[10px] uppercase font-mono text-slate-400">
                            {c.intentConfidence || 'medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-400">
                          {c.gramLength ? `${c.gramLength}-gram` : 'phrase'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-medium font-mono">
                          {c.inTitleCount > 0 ? (
                            <span className="text-emerald-400 font-bold">{c.inTitleCount}</span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-medium font-mono">
                          {c.inHeadingCount > 0 ? (
                            <span className="text-white">{c.inHeadingCount}</span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-[11px]">
                          {importedVol !== undefined ? (
                            <span className="text-emerald-400 font-bold">
                              {importedVol.toLocaleString()} / mo
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">
                              Volume: unavailable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-[11px] text-cerulean/80">
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
          <div className="p-4 bg-jet-950 border border-cerulean/30 text-cerulean-300 rounded-xl text-xs space-y-1 shadow-glow-cerulean">
            <div className="flex items-center gap-2 font-bold text-white font-orbitron">
              <Layers className="w-4 h-4 text-cerulean" />
              <span>Hierarchical Keyword Architecture (Head → Modifier → Long-Tail)</span>
            </div>
            <p className="text-slate-300">
              Discovered core head topics mapped across modifier dimensions. Green tags represent active long-tail combinations present on your site; dashed rose tags represent high-value candidate gaps not yet targeted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keywordMap.headTerms.map((head, idx) => (
              <Card key={idx} className="p-4 bg-jet-900 border-jet-800 space-y-3">
                <div className="flex items-center justify-between border-b border-jet-800 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white capitalize font-orbitron">
                      {head.headTerm}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {head.pageCount} pages · {head.occurrenceCount} occurrences
                    </span>
                  </div>
                  <Badge variant="low">Head Topic</Badge>
                </div>

                <div className="space-y-2">
                  {head.modifiers.map((mod, mIdx) => (
                    <div key={mIdx} className="text-xs space-y-1 bg-jet-950 p-2.5 rounded-lg border border-jet-800">
                      <div className="font-semibold text-slate-300 flex items-center justify-between">
                        <span>Modifier: <strong className="text-cerulean">{mod.modifier}</strong></span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {mod.longTailPresent.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-mono"
                          >
                            ✓ {p}
                          </span>
                        ))}
                        {mod.suggestedGaps.map((g, gIdx) => (
                          <span
                            key={gIdx}
                            className="px-2 py-0.5 rounded text-[10px] bg-rose-950/40 text-neon border border-dashed border-neon/50 font-mono"
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
          <div className="p-4 bg-jet-950 border border-neon/30 text-rose-300 rounded-xl text-xs space-y-1 shadow-glow-rose">
            <div className="flex items-center gap-2 font-bold text-white font-orbitron">
              <GitMerge className="w-4 h-4 text-neon" />
              <span>Internal Keyword Cannibalization Detection</span>
            </div>
            <p className="text-slate-300">
              When multiple pages simultaneously target the same primary keyword in title or h1 tags, search engine ranking equity is split. Resolve by canonicalizing, merging, or differentiating angles.
            </p>
          </div>

          {cannibalizationIssues.length === 0 ? (
            <Card className="p-8 text-center bg-jet-900 border-jet-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white font-orbitron">Zero Cannibalization Conflicts</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No overlapping primary keywords were detected across your audited page titles and main headings.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {cannibalizationIssues.map((issue, idx) => (
                <Card key={idx} className="p-4 bg-jet-900 border-jet-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jet-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="critical">Competing Keyword</Badge>
                      <span className="font-bold text-sm text-neon font-orbitron">"{issue.keyword}"</span>
                    </div>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded uppercase bg-cerulean-950/60 text-cerulean border border-cerulean/40">
                      Action: {issue.recommendation}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <div>
                      <strong className="text-slate-300">Primary Page:</strong>{' '}
                      <span className="font-mono text-cerulean break-all">{issue.primaryUrl}</span>
                    </div>
                    <div>
                      <strong className="text-slate-300">Competing URL(s):</strong>
                      <ul className="list-disc list-inside font-mono text-neon pl-1">
                        {issue.competingUrls.map((u, uIdx) => (
                          <li key={uIdx} className="break-all">{u}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 bg-jet-950 border border-jet-800 rounded text-slate-300 mt-2">
                      <strong className="text-white">Guidance:</strong>{' '}
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
            <Card className="p-5 bg-jet-900 border-jet-800 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-white text-sm font-orbitron">
                  <Globe className="w-4 h-4 text-cerulean" />
                  <span>Public Autocomplete Demand Signals</span>
                </div>
                <p className="text-xs text-slate-400">
                  Query Google suggest API live to discover real user search queries for your products and topics.
                </p>
              </div>

              <form onSubmit={handleFetchAutocomplete} className="flex gap-2">
                <input
                  type="text"
                  value={autocompleteInput}
                  onChange={(e) => setAutocompleteInput(e.target.value)}
                  placeholder="e.g. perfume oil, crm software..."
                  className="text-xs bg-jet-950 border border-jet-700 rounded-lg px-3 py-2 flex-1 text-white placeholder:text-slate-500 focus:outline-none focus:border-cerulean focus:ring-1 focus:ring-cerulean"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isFetchingAutocomplete}
                  className="bg-cerulean hover:bg-cerulean-400 text-jet-950 font-bold text-xs"
                >
                  {isFetchingAutocomplete ? 'Querying...' : 'Get Suggestions'}
                </Button>
              </form>

              {autocompleteResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-jet-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-rajdhani">
                    Autocomplete Suggestions (Live Public Demand)
                  </span>
                  <div className="space-y-1">
                    {autocompleteResults.map((s, idx) => (
                      <div key={idx} className="text-xs font-medium text-white bg-jet-950 border border-jet-800 px-2.5 py-1.5 rounded flex items-center justify-between">
                        <span>{s}</span>
                        <span className="text-[10px] text-cerulean font-mono">autocomplete</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    * Derived directly from live public autocomplete signals; explicitly not manufactured search volumes.
                  </p>
                </div>
              )}
            </Card>

            {/* CSV Search Volume Importer */}
            <Card className="p-5 bg-jet-900 border-jet-800 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-white text-sm font-orbitron">
                  <Upload className="w-4 h-4 text-neon" />
                  <span>Import External Search Volume (CSV)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Upload exported CSV from Google Keyword Planner, Ahrefs, Semrush, or DataForSEO with columns <code className="font-mono text-cerulean">keyword,volume</code>.
                </p>
              </div>

              <div className="p-4 border-2 border-dashed border-jet-700 bg-jet-950 rounded-xl text-center space-y-2">
                <input
                  type="file"
                  id="csv-volume-upload"
                  accept=".csv"
                  onChange={handleCsvImport}
                  className="hidden"
                />
                <label
                  htmlFor="csv-volume-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cerulean text-jet-950 rounded-lg text-xs font-bold cursor-pointer hover:bg-cerulean-400 transition-colors shadow-glow-cerulean"
                >
                  <Upload className="w-3.5 h-3.5" /> Select Keyword CSV
                </label>
                <div className="text-[11px] text-slate-400">
                  Volumes are merged in client memory only. Nothing is saved or uploaded to any server.
                </div>
              </div>

              {csvUploadSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
