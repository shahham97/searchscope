import React, { useState } from 'react';
import {
  Check,
  Copy,
  Filter,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Finding, Category, Severity } from '../types/audit';

interface CategoryFindingsProps {
  findings: Finding[];
  initialCategory?: string;
}

export const CategoryFindings: React.FC<CategoryFindingsProps> = ({
  findings,
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [urlSearch, setUrlSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'technical', label: 'Technical SEO' },
    { key: 'onpage', label: 'On-Page SEO' },
    { key: 'content', label: 'Content Quality' },
    { key: 'structured_data', label: 'Structured Data' },
    { key: 'aeo', label: 'AEO' },
    { key: 'geo', label: 'GEO' },
    { key: 'performance', label: 'Performance' },
  ];

  const severities: { key: string; label: string }[] = [
    { key: 'all', label: 'All Severities' },
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
    { key: 'informational', label: 'Info' },
  ];

  const filteredFindings = findings.filter((f) => {
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (urlSearch.trim()) {
      const q = urlSearch.toLowerCase();
      return (
        f.affectedUrl.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.evidence.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <Card className="p-4 bg-white border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center">
              <Filter className="h-3.5 w-3.5 mr-1" /> Category:
            </span>
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === c.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {severities.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* URL/Keyword Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={urlSearch}
                onChange={(e) => setUrlSearch(e.target.value)}
                placeholder="Filter by keyword or URL..."
                className="text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 w-full sm:w-48 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Findings Count Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredFindings.length}</strong> finding
          {filteredFindings.length !== 1 ? 's' : ''} (out of {findings.length} total)
        </span>
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <Card className="p-12 text-center bg-white border-slate-200">
          <Check className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">No issues found matching criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or selecting another category.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;

            return (
              <Card
                key={finding.id}
                className="p-5 sm:p-6 bg-white border-slate-200 hover:border-slate-300 transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={finding.severity as any}>
                      {finding.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="neutral">
                      {finding.category.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {finding.id}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      Effort: <strong className="ml-1 capitalize">{finding.effort.replace('_', ' ')}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Confidence: <strong className="capitalize">{finding.confidence}</strong>
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {finding.title}
                </h3>

                <p className="text-xs text-slate-500 font-mono mb-3 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 truncate">
                  <strong>Affected URL:</strong> {finding.affectedUrl}
                </p>

                {/* Evidence Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-3 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                    Observed Evidence:
                  </div>
                  <p className="font-mono text-slate-800 break-words">{finding.evidence}</p>
                </div>

                {/* Why It Matters */}
                <div className="text-xs text-slate-600 mb-4 leading-relaxed">
                  <strong className="text-slate-800 font-semibold">Why it matters: </strong>
                  {finding.whyItMatters}
                </div>

                {/* Recommended Fix */}
                <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs">
                  <div className="font-bold text-indigo-950 mb-1 flex items-center">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                    Recommended Remediation:
                  </div>
                  <p className="text-slate-700 mb-3 leading-relaxed">{finding.recommendedFix}</p>

                  {/* Implementation Code Snippet if present */}
                  {finding.implementationExample && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Copy-Ready Implementation Snippet:</span>
                        <button
                          onClick={() => handleCopyCode(finding.id, finding.implementationExample!)}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {copiedId === finding.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" /> Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
                        <code>{finding.implementationExample}</code>
                      </pre>
                    </div>
                  )}

                  {/* Validation Instructions */}
                  <div className="mt-3 pt-3 border-t border-indigo-100/60 text-[11px] text-slate-600">
                    <strong className="text-slate-800">How to validate: </strong>
                    {finding.validationInstructions}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
