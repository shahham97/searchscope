import React, { useState } from 'react';
import { Search, Sliders, CheckCircle2, Shield, Globe, Cpu, Layers, Server, Lock, ExternalLink } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-10">
      {/* Truth in Privacy Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Independent Technical Search Intelligence</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
          100% Private Website Audits. Nothing Is Saved.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          SearchScope discovers and analyzes your accessible pages, technical SEO, structured data, information architecture, AEO, and GEO without requiring accounts, logins, or database storage.
        </p>

        {/* 4 Truth-in-Privacy Disclosure Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left pt-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              <span>Zero-Database Storage</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Reports and domain lists exist exclusively in transient serverless memory and your browser. Nothing is persisted to disk.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
              <Server className="h-4 w-4 text-slate-700" />
              <span>Host Logs Disclosure</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Standard edge infrastructure (Vercel) logs HTTP access metadata (IP, timestamp, path) ephemerally for reliability.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
              <Cpu className="h-4 w-4 text-slate-700" />
              <span>Deterministic Rules</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Zero paid AI dependencies. Scoring, PageRank, and schema checks operate offline with 100% deterministic rules.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
              <Layers className="h-4 w-4 text-slate-700" />
              <span>Explicit Opt-In</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Optional BYOK AI Agent mode uses client memory exclusively; credentials are never transmitted to a backend store.
            </p>
          </div>
        </div>
      </div>

      {/* Main Audit Launcher Card */}
      <Card className="p-6 sm:p-8 border-slate-200 shadow-sm bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="domain-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Website Domain or URL
            </label>
            <div className="relative flex flex-col sm:flex-row rounded-lg shadow-sm gap-2 sm:gap-0">
              <div className="relative flex-1">
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
                  className="block w-full rounded-lg sm:rounded-r-none border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 min-h-[44px]"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="rounded-lg sm:rounded-l-none px-6 sm:px-8 font-semibold tracking-wide shrink-0 bg-slate-900 hover:bg-slate-800 text-white min-h-[44px]"
              >
                <Search className="h-4 w-4 mr-2" />
                Launch Audit
              </Button>
            </div>
            {validationError && (
              <p className="mt-2 text-xs text-rose-600 font-medium">{validationError}</p>
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
                className={`p-3.5 text-left rounded-lg border transition-all min-h-[44px] ${
                  depth === 'quick'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">Quick Audit</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                    25 pages
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Fast diagnostic crawl across seed navigation routes.</p>
              </button>

              <button
                type="button"
                onClick={() => setDepth('standard')}
                className={`p-3.5 text-left rounded-lg border transition-all min-h-[44px] ${
                  depth === 'standard'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">Standard Audit</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                    100 pages
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Balanced analysis for catalog and content sections.</p>
              </button>

              <button
                type="button"
                onClick={() => setDepth('deep')}
                className={`p-3.5 text-left rounded-lg border transition-all min-h-[44px] ${
                  depth === 'deep'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">Deep Crawl</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                    200 pages
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Thorough inspection with stratified sampling.</p>
              </button>
            </div>
          </div>

          {/* Module toggles & Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center space-x-1.5 min-h-[44px] py-1"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showAdvanced ? 'Hide Analysis Modules' : 'Customize Analysis Modules'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center space-x-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={includeStructuredData}
                    onChange={(e) => setIncludeStructuredData(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <span className="text-slate-800 font-medium">Schema.org JSON-LD & GMC Validation</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={includeAeoGeo}
                    onChange={(e) => setIncludeAeoGeo(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <span className="text-slate-800 font-medium">AEO & GEO Readiness Check</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={includeContent}
                    onChange={(e) => setIncludeContent(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <span className="text-slate-800 font-medium">Content Depth & SimHash Clustering</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={checkBrokenLinks}
                    onChange={(e) => setCheckBrokenLinks(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <span className="text-slate-800 font-medium">Internal Link Graph & PageRank</span>
                </label>
              </div>
            )}
          </div>

          {/* Privacy & Guarantee badges */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-y-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                No Account Required
              </span>
              <span className="flex items-center">
                <Shield className="h-3.5 w-3.5 text-slate-700 mr-1.5" />
                Zero Persistent Storage
              </span>
              <span className="flex items-center">
                <Cpu className="h-3.5 w-3.5 text-slate-700 mr-1.5" />
                Deterministic Scoring
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">Strict SSRF & Rebinding Safeguards</span>
          </div>
        </form>
      </Card>
    </div>
  );
};
