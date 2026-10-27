import React, { useState } from 'react';
import { Search, Sliders, CheckCircle2, Shield, Globe, Cpu, Layers, Server, Lock, Zap } from 'lucide-react';
import { Card } from './ui/Card';
import { AuditConfig } from '../types/audit';
import { CyberSeoHeroVisual, CyberFeatureSectionVisual } from './ui/CyberSeoVisuals';

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
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-14">
      {/* Hero Section with Robotic Visual Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Headlines & Launcher Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-jet-900 border border-cerulean/40 text-cerulean text-xs font-rajdhani font-bold uppercase tracking-widest shadow-glow-cerulean">
            <Zap className="h-3.5 w-3.5 text-neon" />
            <span>AUTONOMOUS CYBER SEARCH INTELLIGENCE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-orbitron font-extrabold text-white tracking-tight leading-none">
            DEEP SEO <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cerulean via-cerulean-light to-neon text-glow-cerulean">
              AEO & GEO
            </span>{' '}
            <br />
            AUDITOR
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-xl">
            Autonomous multi-engine crawlability auditor. Deeply inspects PageRank authority, Google Merchant Center schema, 64-bit SimHash duplicates, and answer-engine machine readability with <strong className="text-white">100% private, transient memory execution</strong>.
          </p>

          {/* Main Audit Launcher Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-jet-900/95 border border-jet-800 shadow-cyber-card relative overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="domain-input" className="block text-xs font-rajdhani font-bold uppercase tracking-widest text-slate-300 mb-2">
                  Target Website Domain or URL
                </label>
                <div className="relative flex flex-col sm:flex-row rounded-xl shadow-inner gap-2 sm:gap-0">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-cerulean">
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
                      className="block w-full rounded-xl sm:rounded-r-none border border-jet-700 pl-12 pr-4 py-3.5 text-sm font-mono text-white bg-jet-950 placeholder:text-slate-500 focus:border-cerulean focus:outline-none focus:ring-1 focus:ring-cerulean min-h-[48px]"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-xl sm:rounded-l-none px-7 py-3.5 font-orbitron font-bold text-xs uppercase tracking-widest shrink-0 bg-gradient-to-r from-cerulean to-neon hover:from-cerulean-glow hover:to-neon-glow text-jet-950 min-h-[48px] shadow-glow-cerulean hover:shadow-glow-rose transition-all duration-300 flex items-center justify-center cursor-pointer"
                  >
                    <Search className="h-4 w-4 mr-2 text-jet-950" />
                    {isLoading ? 'Scanning...' : 'Launch Audit'}
                  </button>
                </div>
                {validationError && (
                  <p className="mt-2 text-xs font-rajdhani font-semibold text-neon">{validationError}</p>
                )}
              </div>

              {/* Audit Scope Presets */}
              <div>
                <label className="block text-xs font-rajdhani font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Audit Scope & Crawl Depth
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDepth('quick')}
                    className={`p-3 text-left rounded-xl border transition-all min-h-[44px] ${
                      depth === 'quick'
                        ? 'border-cerulean bg-jet-850 shadow-glow-cerulean text-white'
                        : 'border-jet-800 hover:border-jet-700 bg-jet-950/70 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-orbitron font-bold text-xs">Quick Audit</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-jet-800 text-cerulean">25 pages</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">Core pages & navigation checks.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepth('standard')}
                    className={`p-3 text-left rounded-xl border transition-all min-h-[44px] ${
                      depth === 'standard'
                        ? 'border-cerulean bg-jet-850 shadow-glow-cerulean text-white'
                        : 'border-jet-800 hover:border-jet-700 bg-jet-950/70 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-orbitron font-bold text-xs">Standard</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-jet-800 text-cerulean">100 pages</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">Catalog & content depth audit.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepth('deep')}
                    className={`p-3 text-left rounded-xl border transition-all min-h-[44px] ${
                      depth === 'deep'
                        ? 'border-neon bg-jet-850 shadow-glow-rose text-white'
                        : 'border-jet-800 hover:border-jet-700 bg-jet-950/70 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-orbitron font-bold text-xs">Deep Crawl</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-jet-800 text-neon">200 pages</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">Stratified sampling across 8 types.</p>
                  </button>
                </div>
              </div>

              {/* Module toggles & Advanced Settings */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-rajdhani font-bold uppercase tracking-wider text-cerulean hover:text-white flex items-center space-x-1.5 py-1 min-h-[36px]"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>{showAdvanced ? 'Hide Engine Modules' : 'Customize Engine Modules'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 rounded-xl bg-jet-950 border border-jet-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={includeStructuredData}
                        onChange={(e) => setIncludeStructuredData(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean focus:ring-cerulean h-4 w-4 bg-jet-900"
                      />
                      <span className="text-slate-200 font-sans">Schema.org JSON-LD & GMC</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={includeAeoGeo}
                        onChange={(e) => setIncludeAeoGeo(e.target.checked)}
                        className="rounded border-jet-700 text-neon focus:ring-neon h-4 w-4 bg-jet-900"
                      />
                      <span className="text-slate-200 font-sans">AEO & GEO Readiness Check</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={includeContent}
                        onChange={(e) => setIncludeContent(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean focus:ring-cerulean h-4 w-4 bg-jet-900"
                      />
                      <span className="text-slate-200 font-sans">Content Depth & SimHash (64-bit)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={checkBrokenLinks}
                        onChange={(e) => setCheckBrokenLinks(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean focus:ring-cerulean h-4 w-4 bg-jet-900"
                      />
                      <span className="text-slate-200 font-sans">Internal Link Graph & PageRank</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Privacy Badges */}
              <div className="pt-3 border-t border-jet-800 flex flex-wrap items-center justify-between text-xs font-rajdhani text-slate-400 gap-y-2">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Zero Account Required
                  </span>
                  <span className="flex items-center text-cerulean font-semibold">
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    Zero Database Persistence
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">SSRF & DNS PINNING SAFE</span>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: High-Tech Cyber Crawler Visual */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <CyberSeoHeroVisual />
        </div>
      </div>

      {/* 4 Truth-in-Privacy Disclosure Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-jet-900/80 border border-jet-800 space-y-1.5 shadow-cyber-card">
          <div className="flex items-center space-x-2 text-xs font-orbitron font-bold text-white">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>Zero-Storage Model</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal font-sans">
            Domain lists and audit findings exist exclusively in transient serverless execution and your browser memory. Nothing is written to database.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-jet-900/80 border border-jet-800 space-y-1.5 shadow-cyber-card">
          <div className="flex items-center space-x-2 text-xs font-orbitron font-bold text-white">
            <Server className="h-4 w-4 text-cerulean" />
            <span>Host Logs Policy</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal font-sans">
            Vercel edge infrastructure logs standard HTTP request metadata (IP, timestamp, path) ephemerally for uptime and DDoS defense.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-jet-900/80 border border-jet-800 space-y-1.5 shadow-cyber-card">
          <div className="flex items-center space-x-2 text-xs font-orbitron font-bold text-white">
            <Cpu className="h-4 w-4 text-neon" />
            <span>Deterministic Rules</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal font-sans">
            Zero third-party LLM transmission. Scoring, PageRank, and schema checks operate offline with 100% deterministic mathematical rules.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-jet-900/80 border border-jet-800 space-y-1.5 shadow-cyber-card">
          <div className="flex items-center space-x-2 text-xs font-orbitron font-bold text-white">
            <Layers className="h-4 w-4 text-cerulean" />
            <span>Client BYOK Opt-In</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal font-sans">
            Optional developer AI Agent mode uses client memory exclusively; credentials are never transmitted to any persistent store.
          </p>
        </div>
      </div>

      {/* Cyber Feature Section Visuals */}
      <div className="pt-6">
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-orbitron font-extrabold text-white tracking-wide">
            ENTERPRISE SEARCH INTELLIGENCE ENGINE
          </h2>
          <p className="text-xs font-rajdhani font-semibold uppercase tracking-widest text-slate-400">
            Powered by algorithmic link graphs, Schema entity models, and 64-bit content fingerprints
          </p>
        </div>
        <CyberFeatureSectionVisual />
      </div>
    </div>
  );
};
