'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Zap,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Finding } from '../types/audit';

interface CategoryFindingsProps {
  findings: Finding[];
  initialCategory?: string;
}

export const CategoryFindings: React.FC<CategoryFindingsProps> = ({
  findings = [],
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [urlSearch, setUrlSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Dimensions' },
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

  const filteredFindings = (findings || []).filter((f) => {
    if (!f) return false;
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (urlSearch.trim()) {
      const q = urlSearch.toLowerCase();
      const urlMatch =
        (f.affectedUrl || '').toLowerCase().includes(q) ||
        (f.affectedUrls || []).some((u) => (u || '').toLowerCase().includes(q));
      const titleMatch = (f.title || '').toLowerCase().includes(q);
      const evidenceMatch = (f.evidence || '').toLowerCase().includes(q);
      return urlMatch || titleMatch || evidenceMatch;
    }
    return true;
  });

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-rajdhani font-bold uppercase tracking-wider bg-neon/15 text-neon border border-neon/50 shadow-[0_0_10px_rgba(255,0,127,0.3)]">
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-rajdhani font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/40">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-rajdhani font-bold uppercase tracking-wider bg-cerulean/15 text-cerulean border border-cerulean/40">
            MEDIUM
          </span>
        );
      case 'low':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-rajdhani font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-rajdhani font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="p-4 sm:p-5 bg-jet-900/90 border border-jet-800 rounded-2xl shadow-cyber-card backdrop-blur-md">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap -mx-1 px-1 sm:mx-0 sm:px-0 custom-scrollbar">
            <span className="text-xs font-rajdhani font-bold uppercase tracking-widest text-cerulean mr-1 flex items-center shrink-0">
              <Filter className="h-3.5 w-3.5 mr-1 text-cerulean" /> Dimension:
            </span>
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedCategory(c.key)}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-rajdhani font-bold uppercase tracking-wider transition-all min-h-[36px] shrink-0 ${
                  selectedCategory === c.key
                    ? 'bg-jet-850 text-white border border-cerulean shadow-glow-cerulean'
                    : 'bg-jet-950 text-slate-400 hover:text-white hover:bg-jet-800 border border-jet-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full sm:w-auto">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs font-rajdhani font-bold uppercase tracking-wider border border-jet-800 rounded-lg px-3 py-2 bg-jet-950 text-slate-200 focus:outline-none focus:border-cerulean min-h-[44px] w-full sm:w-auto"
            >
              {severities.map((s) => (
                <option key={s.key} value={s.key} className="bg-jet-950 text-white">
                  {s.label}
                </option>
              ))}
            </select>

            {/* URL/Keyword Search */}
            <div className="relative w-full sm:w-auto">
              <Search className="h-3.5 w-3.5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                value={urlSearch}
                onChange={(e) => setUrlSearch(e.target.value)}
                placeholder="Filter by URL or keyword..."
                className="text-xs border border-jet-800 rounded-lg pl-9 pr-3 py-2 w-full sm:w-56 bg-jet-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-cerulean min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Findings Count Header */}
      <div className="flex items-center justify-between text-xs font-rajdhani font-semibold uppercase tracking-wider text-slate-400 px-1">
        <span>
          Showing <strong className="text-white font-mono">{filteredFindings.length}</strong> findings (out of{' '}
          <span className="font-mono">{findings.length}</span> total)
        </span>
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-jet-900 border border-jet-800 rounded-2xl shadow-cyber-card">
          <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-base font-orbitron font-bold text-white tracking-wide">No issues found matching criteria</h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">All analyzed pages passed the selected dimension checks.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding, idx) => {
            return (
              <div
                key={`${finding.id}-${idx}`}
                className="p-4 sm:p-6 bg-jet-900/95 border border-jet-800/90 hover:border-cerulean/50 transition-all rounded-2xl shadow-cyber-card space-y-3.5 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(finding.severity)}
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-rajdhani font-bold uppercase tracking-wider bg-jet-850 text-slate-300 border border-jet-700">
                      {(finding.category || '').replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {finding.id}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-rajdhani text-slate-400">
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      Effort: <strong className="ml-1 text-slate-200 capitalize">{(finding.effort || 'moderate').replace('_', ' ')}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Confidence: <strong className="text-slate-200 capitalize">{finding.confidence || 'high'}</strong>
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-orbitron font-bold text-white tracking-wide">
                  {finding.title}
                </h3>

                <p className="text-xs text-slate-300 font-mono bg-jet-950 px-3 py-2 rounded-lg border border-jet-800 break-all">
                  <strong className="text-cerulean">Affected URL:</strong> {finding.affectedUrl || finding.affectedUrls?.[0] || 'Domain Level'}
                </p>

                {/* Evidence Box */}
                <div className="p-3.5 bg-jet-950 rounded-xl border border-jet-800 text-xs text-slate-200">
                  <div className="font-rajdhani font-bold text-neon uppercase tracking-wider mb-1 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 text-neon" />
                    Observed Evidence:
                  </div>
                  <p className="font-mono text-slate-300 break-words leading-relaxed">{finding.evidence}</p>
                </div>

                {/* Why It Matters */}
                <div className="text-xs text-slate-300 leading-relaxed font-sans">
                  <strong className="text-white font-semibold">Why it matters: </strong>
                  {finding.whyItMatters}
                </div>

                {/* Recommended Fix */}
                <div className="p-4 bg-jet-850/80 rounded-xl border border-cerulean/30 text-xs space-y-2">
                  <div className="font-rajdhani font-bold text-cerulean uppercase tracking-wider flex items-center">
                    <Zap className="h-3.5 w-3.5 mr-1.5 text-cerulean" />
                    Recommended Remediation:
                  </div>
                  <p className="text-slate-200 leading-relaxed font-sans">{finding.recommendedFix}</p>

                  {/* Implementation Code Snippet if present */}
                  {finding.implementationExample && (
                    <div className="mt-3 pt-2 border-t border-jet-700">
                      <div className="flex items-center justify-between text-[11px] font-rajdhani font-bold uppercase text-slate-300 mb-1.5">
                        <span className="text-cerulean">Implementation Snippet:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(finding.id, finding.implementationExample!)}
                          className="inline-flex items-center text-xs font-rajdhani font-bold uppercase tracking-wider text-cerulean hover:text-white"
                        >
                          {copiedId === finding.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" /> Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-black text-cerulean-light rounded-lg text-[11px] font-mono overflow-x-auto border border-jet-700">
                        <code>{finding.implementationExample}</code>
                      </pre>
                    </div>
                  )}

                  {/* Validation Instructions */}
                  <div className="pt-2 text-[11px] text-slate-400 font-sans">
                    <strong className="text-slate-200">How to validate: </strong>
                    {finding.validationInstructions}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
