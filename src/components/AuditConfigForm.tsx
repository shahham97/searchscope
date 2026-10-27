import React, { useState } from 'react';
import { Search, Sliders, CheckCircle2, Shield, Globe, Cpu, Layers, Server, Lock, Zap, Mail } from 'lucide-react';
import { Card } from './ui/Card';
import { AuditConfig } from '../types/audit';
import { CyberSeoHeroVisual, CyberFeatureSectionVisual } from './ui/CyberSeoVisuals';
import { GmailContactLink } from './layout/GmailContactLink';

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
    <div className="max-w-7xl mx-auto py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
      {/* Hero Section with Robotic Visual Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Headlines & Launcher Form */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-retro-orange/15 border border-retro-orange/40 text-retro-orange text-[10px] sm:text-xs font-retro font-bold uppercase tracking-wider shadow-sm">
            <Zap className="h-3.5 w-3.5 text-retro-orange shrink-0" />
            <span className="truncate">RETRO RADIANCE · VINTAGE SEARCH INTELLIGENCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-retro font-black text-white tracking-tight leading-none">
            DISCOVER THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-retro-orange via-[#FF7A45] to-amber-400">
              RETRO SEO
            </span>{' '}
            <br />
            <span className="font-serif italic font-normal text-retro-cream text-2xl sm:text-4xl lg:text-5xl block mt-2">
              Radiance & AEO Deck
            </span>
          </h1>

          <p className="text-xs sm:text-base text-slate-300 font-sans leading-relaxed max-w-xl">
            Celebrating the timeless allure of deep, deterministic crawlability. Inspects PageRank authority, Google Merchant Center schema, 64-bit SimHash duplicates, and answer-engine machine readability with <strong className="text-retro-cream">100% private, transient memory execution</strong>.
          </p>

          {/* Main Audit Launcher Card */}
          <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-jet-900/95 border border-jet-800 shadow-retro-card relative overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="domain-input" className="block text-xs font-retro font-bold uppercase tracking-widest text-slate-300 mb-2">
                  Target Website Domain or URL
                </label>
                <div className="relative flex flex-col sm:flex-row rounded-xl shadow-inner gap-2 sm:gap-0">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-retro-orange">
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
                      className="block w-full rounded-xl sm:rounded-r-none border border-jet-700 pl-12 pr-4 py-3.5 text-sm font-mono text-white bg-jet-950 placeholder:text-slate-500 focus:border-retro-orange focus:outline-none focus:ring-1 focus:ring-retro-orange min-h-[48px]"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto rounded-xl sm:rounded-l-none px-7 py-3.5 font-retro font-bold text-xs uppercase tracking-widest shrink-0 bg-gradient-to-r from-retro-orange to-[#E64A14] hover:from-retro-orange-hover hover:to-retro-orange text-white min-h-[48px] shadow-retro-orange transition-all duration-300 flex items-center justify-center cursor-pointer"
                  >
                    <Search className="h-4 w-4 mr-2 text-white" />
                    {isLoading ? 'Scanning Tape...' : 'Explore Now'}
                  </button>
                </div>
                {validationError && (
                  <p className="mt-2 text-xs font-retro font-semibold text-retro-orange">{validationError}</p>
                )}
              </div>

              {/* Audit Scope Presets */}
              <div>
                <label className="block text-xs font-retro font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Audit Scope & Tape Length
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDepth('quick')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      depth === 'quick'
                        ? 'border-retro-orange bg-jet-850 text-white shadow-retro-orange'
                        : 'border-jet-800 bg-jet-950/80 text-slate-400 hover:border-jet-700 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-retro font-bold text-xs uppercase">Quick Side-A</span>
                      <span className="font-mono text-[10px] text-retro-orange font-bold">25 URLs</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-tight">
                      Rapid crawl of homepage & core navigational templates.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepth('standard')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      depth === 'standard'
                        ? 'border-retro-orange bg-jet-850 text-white shadow-retro-orange'
                        : 'border-jet-800 bg-jet-950/80 text-slate-400 hover:border-jet-700 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-retro font-bold text-xs uppercase">Standard Hi-Fi</span>
                      <span className="font-mono text-[10px] text-retro-orange font-bold">100 URLs</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-tight">
                      Balanced crawl discovering products, articles, & schemas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepth('deep')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      depth === 'deep'
                        ? 'border-retro-teal bg-jet-850 text-white shadow-glow-rose'
                        : 'border-jet-800 bg-jet-950/80 text-slate-400 hover:border-jet-700 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-retro font-bold text-xs uppercase text-retro-teal">Master Scope</span>
                      <span className="font-mono text-[10px] text-retro-teal font-bold">200 URLs</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-tight">
                      Full site graph sampling, orphan detection, & AEO intent mapping.
                    </p>
                  </button>
                </div>
              </div>

              {/* Advanced Diagnostic Settings Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex items-center text-xs font-rajdhani font-bold uppercase tracking-wider text-cerulean hover:text-white transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5 mr-1.5" />
                  {showAdvanced ? 'Hide Advanced Engines' : 'Configure Advanced Engines'}
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 rounded-xl bg-jet-950 border border-jet-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeContent}
                        onChange={(e) => setIncludeContent(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean bg-jet-900 focus:ring-cerulean"
                      />
                      <span className="text-slate-300">Content Depth & Flesch-Kincaid</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAeoGeo}
                        onChange={(e) => setIncludeAeoGeo(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean bg-jet-900 focus:ring-cerulean"
                      />
                      <span className="text-slate-300">AEO Q&A & GEO Machine Signals</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeStructuredData}
                        onChange={(e) => setIncludeStructuredData(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean bg-jet-900 focus:ring-cerulean"
                      />
                      <span className="text-slate-300">Schema.org JSON-LD Verification</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkBrokenLinks}
                        onChange={(e) => setCheckBrokenLinks(e.target.checked)}
                        className="rounded border-jet-700 text-cerulean bg-jet-900 focus:ring-cerulean"
                      />
                      <span className="text-slate-300">Internal Link Graph & PageRank</span>
                    </label>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: High-Tech Cyber Crawler Visual with Interactive Parallax */}
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

      {/* Direct Developer Contact Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-jet-900/90 border border-jet-800 shadow-cyber-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3 text-xs">
          <div className="h-9 w-9 rounded-xl bg-jet-850 border border-cerulean/40 flex items-center justify-center text-cerulean shrink-0 mt-0.5 sm:mt-0">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-orbitron font-bold text-white text-xs">Developer Direct Inquiries & Custom Crawl Requests</h4>
            <p className="text-slate-400 font-sans text-[11px]">Direct developer support for webmasters, enterprise crawling, or algorithm audit questions:</p>
          </div>
        </div>
        <div className="w-full sm:w-auto flex justify-start sm:justify-end">
          <GmailContactLink email="developerforhirre@gmail.com" variant="pill" />
        </div>
      </div>

      {/* Retro Feature Section Visuals */}
      <div className="pt-4 sm:pt-6">
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl sm:text-3xl font-retro font-black text-white tracking-wide">
            RETRO RADIANCE: TIMELESS SEARCH INTELLIGENCE
          </h2>
          <p className="text-xs sm:text-sm font-serif italic text-retro-orange">
            Celebrating the Timeless Allure of Algorithmic Link Graphs, Schema Models & Hi-Fi Auditing
          </p>
        </div>
        <CyberFeatureSectionVisual />
      </div>
    </div>
  );
};
