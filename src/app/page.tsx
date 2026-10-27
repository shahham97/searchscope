'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart3,
  ListFilter,
  Globe2,
  Layers,
  Tag,
  CheckSquare,
  FileDown,
  AlertCircle,
  RotateCcw,
  Archive,
  Server,
  Cpu,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AuditConfigForm } from '@/components/AuditConfigForm';
import { LiveCrawlStatus } from '@/components/LiveCrawlStatus';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { CategoryFindings } from '@/components/CategoryFindings';
import { UrlExplorer } from '@/components/UrlExplorer';
import { AeoGeoPanel } from '@/components/AeoGeoPanel';
import { SearchIntelPanel } from '@/components/SearchIntelPanel';
import { RoadmapView } from '@/components/RoadmapView';
import { ExportCenter } from '@/components/ExportCenter';
import { CrawlDiagnostics } from '@/components/CrawlDiagnostics';
import { PrivacyModal } from '@/components/PrivacyModal';
import { AgentTab } from '@/components/agent/AgentTab';
import { orchestrateClientAudit } from '@/lib/crawler/client-orchestrator';
import { AuditErrorBoundary } from '@/components/ui/AuditErrorBoundary';
import { CyberParallaxBackground } from '@/components/ui/CyberSeoVisuals';
import { AuditConfig, AuditReport } from '@/types/audit';
import { generateAuditPdf } from '@/lib/export/pdf-generator';

const STORAGE_KEY = 'searchscope_active_report';

export default function SearchScopePage() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'findings' | 'urls' | 'aeo_geo' | 'search' | 'roadmap' | 'agent' | 'export' | 'diagnostics'
  >('overview');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Restore active audit from sessionStorage to prevent accidental loss or reload resets
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: AuditReport = JSON.parse(saved);
        if (parsed && (parsed.targetDomain || parsed.overallScore !== undefined)) {
          setReport(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not restore cached report from sessionStorage', err);
    }
  }, []);

  // Save active report to sessionStorage whenever it changes with quota protection
  useEffect(() => {
    try {
      if (report && report.targetDomain) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(report));
      } else if (report === null) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Could not cache full report (quota exceeded), caching compact report', err);
      try {
        if (report && report.targetDomain) {
          const compact = {
            ...report,
            pages: (report.pages || []).slice(0, 50).map((p) => ({
              ...p,
              rawVsRenderedDiff: undefined,
              internalLinks: (p.internalLinks || []).slice(0, 30),
              externalLinks: (p.externalLinks || []).slice(0, 30),
            })),
            ledgerEntries: (report.ledgerEntries || []).slice(0, 100),
          };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
        }
      } catch (innerErr) {
        console.warn('Compact caching also failed', innerErr);
      }
    }
  }, [report]);

  // Crawl progress state
  const [crawlProgress, setCrawlProgress] = useState({
    status: 'Connecting to host and validating safety rules...',
    crawledCount: 0,
    discoveredCount: 1,
    currentUrl: '',
    maxPages: 25,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStartAudit = async (targetUrl: string, config: AuditConfig) => {
    setIsLoading(true);
    setErrorMessage(null);

    setCrawlProgress({
      status: 'Validating DNS and SSRF safety...',
      crawledCount: 0,
      discoveredCount: 1,
      currentUrl: targetUrl,
      maxPages: config.maxPages,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let auditData: AuditReport | undefined;

      try {
        auditData = await orchestrateClientAudit(
          targetUrl,
          config,
          (progress) => {
            setCrawlProgress({
              crawledCount: progress.crawledCount,
              discoveredCount: progress.discoveredCount,
              maxPages: config.maxPages || (config.auditDepth === 'quick' ? 25 : config.auditDepth === 'deep' ? 250 : 100),
              status: progress.status,
              currentUrl: progress.currentUrl,
            });
          },
          controller.signal
        );
      } catch (clientErr: any) {
        if (clientErr?.message?.includes('cancelled')) {
          throw clientErr;
        }
        console.warn('Chunked crawl encountered an issue, executing direct server audit fallback:', clientErr);
        setCrawlProgress((prev) => ({
          ...prev,
          status: 'Direct audit pipeline executing on host...',
        }));

        const fallbackRes = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, config }),
          signal: controller.signal,
        });

        if (!fallbackRes.ok) {
          const errData = await fallbackRes.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with status ${fallbackRes.status}`);
        }

        const data = await fallbackRes.json();
        // IMPORTANT BUG FIX: /api/audit returns the report directly or as data.report
        auditData = data?.report || data;
      }

      if (auditData && (auditData.targetDomain || auditData.overallScore !== undefined)) {
        setReport(auditData);
        setActiveTab('overview');
      } else {
        throw new Error('Audit engine completed, but returned an incomplete report payload.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        setErrorMessage('Audit was cancelled by user.');
      } else {
        setErrorMessage(err.message || 'Audit failed due to a network or server error.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelAudit = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleClearAudit = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setReport(null);
    setErrorMessage(null);
    setActiveTab('overview');
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    setIsGeneratingPdf(true);
    try {
      generateAuditPdf(report);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. Check browser console.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSelectCategoryFromDashboard = (categoryKey: string) => {
    setSelectedCategoryFilter(categoryKey);
    setActiveTab('findings');
  };

  return (
    <CyberParallaxBackground>
      <div className="min-h-full flex flex-col text-white selection:bg-neon selection:text-white">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto mt-6 px-4 w-full">
            <div className="p-4 bg-neon/15 border border-neon/60 rounded-xl flex items-center justify-between text-white text-xs sm:text-sm shadow-glow-rose">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="h-4 w-4 text-neon shrink-0 animate-pulse" />
                <span className="font-sans font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="px-3 py-1 rounded bg-jet-900 border border-neon/40 text-neon hover:bg-neon hover:text-white text-xs font-rajdhani font-bold uppercase transition-all min-h-[36px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* State 1: Configuration Form (Home Page) */}
        {!report && !isLoading && (
          <AuditConfigForm onStartAudit={handleStartAudit} isLoading={isLoading} />
        )}

        {/* State 2: Crawl in Progress with Live Parallax Radar */}
        {isLoading && (
          <LiveCrawlStatus
            status={crawlProgress.status}
            currentUrl={crawlProgress.currentUrl}
            crawledCount={crawlProgress.crawledCount}
            discoveredCount={crawlProgress.discoveredCount}
            maxPages={crawlProgress.maxPages}
            onCancel={handleCancelAudit}
          />
        )}

        {/* State 3: Audit Results Shell */}
        {report && !isLoading && (
          <AuditErrorBoundary onReset={() => setActiveTab('overview')} fallbackTitle="Audit Render Intercepted">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
              {/* Active Audit Action Bar */}
              <div className="bg-jet-900/90 border border-jet-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-cyber-card backdrop-blur-md">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-orbitron font-extrabold text-white text-xl tracking-wide">
                      {report.targetDomain}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-jet-850 text-cerulean border border-cerulean/30">
                      {report.targetNormalizedUrl}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-rajdhani font-medium tracking-wide">
                    AUDITED {report.auditDate} · {report.pages.length} PAGES ANALYZED · {report.findings.length} TOTAL FINDINGS
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2 rounded-xl text-xs font-rajdhani font-bold uppercase tracking-wider bg-cerulean hover:bg-cerulean-glow text-jet-950 flex items-center justify-center shadow-glow-cerulean transition-all min-h-[44px]"
                  >
                    <FileDown className="h-4 w-4 mr-1.5" />
                    {isGeneratingPdf ? 'Compiling PDF...' : 'Download PDF'}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAudit}
                    className="px-3.5 py-2 rounded-xl text-xs font-rajdhani font-bold uppercase tracking-wider bg-jet-850 hover:bg-jet-800 text-slate-300 hover:text-neon border border-jet-700 hover:border-neon flex items-center justify-center transition-all min-h-[44px]"
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5 text-slate-400 group-hover:text-neon" />
                    New Audit
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-jet-800 overflow-x-auto custom-scrollbar">
                <nav className="flex space-x-1 sm:space-x-3" aria-label="Tabs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'overview'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 mr-1.5 text-cerulean" />
                    Overview
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('findings')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'findings'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <ListFilter className="h-4 w-4 mr-1.5 text-cerulean" />
                    Findings <span className="ml-1 font-mono text-[11px] text-cerulean">({report.findings.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('urls')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'urls'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <Globe2 className="h-4 w-4 mr-1.5 text-cerulean" />
                    URL Explorer <span className="ml-1 font-mono text-[11px] text-cerulean">({report.pages.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('aeo_geo')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'aeo_geo'
                        ? 'border-neon text-white text-glow-rose bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <Layers className="h-4 w-4 mr-1.5 text-neon" />
                    AEO & GEO
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'search'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <Tag className="h-4 w-4 mr-1.5 text-cerulean" />
                    Keywords <span className="ml-1 font-mono text-[11px] text-cerulean">({report.keywordCandidates.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('roadmap')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'roadmap'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <CheckSquare className="h-4 w-4 mr-1.5 text-cerulean" />
                    Roadmap <span className="ml-1 font-mono text-[11px] text-cerulean">({report.roadMap.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('diagnostics')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'diagnostics'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <Server className="h-4 w-4 mr-1.5 text-cerulean" />
                    Diagnostics <span className="ml-1 font-mono text-[11px]">({report.diagnostics?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('agent')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'agent'
                        ? 'border-neon text-white text-glow-rose bg-jet-900/60'
                        : 'border-transparent text-neon/80 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <Cpu className="h-4 w-4 mr-1.5 text-neon" />
                    AI Agent (BYOK)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('export')}
                    className={`pb-3 px-3 border-b-2 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center whitespace-nowrap transition-all min-h-[44px] ${
                      activeTab === 'export'
                        ? 'border-cerulean text-white text-glow-cerulean bg-jet-900/60'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-jet-900/40'
                    }`}
                  >
                    <Archive className="h-4 w-4 mr-1.5 text-cerulean" />
                    Export Center
                  </button>
                </nav>
              </div>

              {/* Tab Contents */}
              {activeTab === 'overview' && (
                <ExecutiveDashboard
                  report={report}
                  onDownloadPdf={handleDownloadPdf}
                  onOpenExportCenter={() => setActiveTab('export')}
                  onOpenDiagnostics={() => setActiveTab('diagnostics')}
                  isGeneratingPdf={isGeneratingPdf}
                  onSelectCategory={handleSelectCategoryFromDashboard}
                />
              )}

              {activeTab === 'findings' && (
                <CategoryFindings
                  findings={report.findings}
                  initialCategory={selectedCategoryFilter}
                />
              )}

              {activeTab === 'urls' && (
                <UrlExplorer
                  pages={report.pages}
                  crawlStats={report.crawlStats}
                  ledgerEntries={report.ledgerEntries}
                  dataIntegrity={report.dataIntegrity}
                  samplingDistribution={report.crawlCoverage?.summary}
                />
              )}

              {activeTab === 'aeo_geo' && <AeoGeoPanel report={report} />}

              {activeTab === 'search' && (
                <SearchIntelPanel
                  candidates={report.keywordCandidates}
                  observations={report.searchObservations}
                  keywordMap={report.keywordMap}
                  cannibalizationIssues={report.cannibalizationIssues}
                />
              )}

              {activeTab === 'roadmap' && <RoadmapView roadmap={report.roadMap} />}

              {activeTab === 'diagnostics' && (
                <CrawlDiagnostics
                  diagnostics={report.diagnostics || []}
                  isCrawlFailed={report.isCrawlFailed}
                  crawlFailureReason={report.crawlFailureReason}
                  successfulCount={report.crawlStats.successfulPagesCount}
                  totalAttempted={report.crawlStats.totalPagesCrawled}
                />
              )}

              {activeTab === 'agent' && <AgentTab report={report} />}

              {activeTab === 'export' && <ExportCenter report={report} />}
            </div>
          </AuditErrorBoundary>
        )}

        <PrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      </div>
    </CyberParallaxBackground>
  );
}
