import React, { useState } from 'react';
import { Search, Sliders, CheckCircle2, Shield, Globe, Cpu, Sparkles, FileCode } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { AuditConfig } from '../types/audit';

interface AuditConfigFormProps {
  onStartAudit: (targetUrl: string, config: AuditConfig) => void;
  isLoading: boolean;
}

export const AuditConfigForm: React.FC<AuditConfigFormProps> = ({ onStartAudit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('quick');
  const [includeContent, setIncludeContent] = useState(true);
  const [includeAeoGeo, setIncludeAeoGeo] = useState(true);
  const [includeStructuredData, setIncludeStructuredData] = useState(true);
  const [checkBrokenLinks, setCheckBrokenLinks] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      setValidationError('Please enter a website domain or full URL.');
      return;
    }

    // Basic domain validation
    if (
      cleanUrl.toLowerCase().includes('localhost') ||
      cleanUrl.includes('127.0.0.1') ||
      cleanUrl.includes('169.254.') ||
      cleanUrl.includes('10.0.') ||
      cleanUrl.includes('192.168.')
    ) {
      setValidationError('Localhost and private IP addresses are blocked by SSRF safeguards.');
      return;
    }

    setValidationError(null);

    const maxPages = depth === 'quick' ? 25 : depth === 'standard' ? 100 : 200;

    const config: AuditConfig = {
      targetUrl: cleanUrl,
      auditDepth: depth,
      maxPages,
      includeContentAnalysis: includeContent,
      includeAeoGeo,
      includeStructuredData,
      checkBrokenLinks,
      searchDiscoveryEnabled: false,
    };

    onStartAudit(cleanUrl, config);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Professional Search Intelligence</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Website SEO, AEO & GEO Auditor
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Audit technical indexability, schema integrity, Answer Engine citations, and generative AI search readiness with zero accounts and zero paid API keys.
        </p>
      </div>

      <Card className="p-6 sm:p-8 border-slate-200/90 shadow-lg bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="domain-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Website Domain or URL
            </label>
            <div className="relative flex rounded-xl shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Globe className="h-5 w-5" />
              </div>
              <input
                id="domain-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="example.com or https://example.com"
                className="block w-full rounded-l-xl border border-r-0 border-slate-300 pl-11 pr-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="rounded-l-none rounded-r-xl px-6 sm:px-8 font-semibold tracking-wide shrink-0"
              >
                <Search className="h-4 w-4 mr-2" />
                Launch Audit
              </Button>
            </div>
            {validationError && (
              <p className="mt-2 text-sm text-rose-600 font-medium">{validationError}</p>
            )}
          </div>

          {/* Audit Depth Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Audit Scope & Depth
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDepth('quick')}
                className={`p-3.5 text-left rounded-xl border transition-all ${
                  depth === 'quick'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">Quick Audit</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">25 pages</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Recommended for fast diagnostic checks in ~15 seconds.</p>
              </button>

              <button
                type="button"
                onClick={() => setDepth('standard')}
                className={`p-3.5 text-left rounded-xl border transition-all ${
                  depth === 'standard'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">Standard Audit</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">100 pages</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Balanced analysis for small-to-medium business sites.</p>
              </button>

              <button
                type="button"
                onClick={() => setDepth('deep')}
                className={`p-3.5 text-left rounded-xl border transition-all ${
                  depth === 'deep'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">Deep Crawl</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">200 pages</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Comprehensive inspection within serverless timeout budgets.</p>
              </button>
            </div>
          </div>

          {/* Module toggles & Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showAdvanced ? 'Hide Analysis Modules' : 'Customize Analysis Modules'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStructuredData}
                    onChange={(e) => setIncludeStructuredData(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700 font-medium">Schema.org JSON-LD Validation</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAeoGeo}
                    onChange={(e) => setIncludeAeoGeo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700 font-medium">AEO & GEO Readiness Check</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeContent}
                    onChange={(e) => setIncludeContent(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700 font-medium">Content Depth & Flesch Readability</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkBrokenLinks}
                    onChange={(e) => setCheckBrokenLinks(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-slate-700 font-medium">Internal Broken Link Checker</span>
                </label>
              </div>
            )}
          </div>

          {/* Privacy & Guarantee badges */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-y-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-1.5" />
                No Account Required
              </span>
              <span className="flex items-center">
                <Shield className="h-4 w-4 text-indigo-600 mr-1.5" />
                Zero Persistent Storage
              </span>
              <span className="flex items-center">
                <Cpu className="h-4 w-4 text-slate-600 mr-1.5" />
                Deterministic Scoring
              </span>
            </div>
            <span className="text-slate-400">Strict SSRF & Rebinding Protection</span>
          </div>
        </form>
      </Card>
    </div>
  );
};
