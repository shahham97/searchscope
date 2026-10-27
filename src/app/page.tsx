'use client';

import React, { useState, useRef } from 'react';
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
  ExternalLink,
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
import { Button } from '@/components/ui/Button';
import { AuditConfig, AuditReport } from '@/types/audit';
import { generateAuditPdf } from '@/lib/export/pdf-generator';

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
    setReport(null);

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
      let auditData: AuditReport;
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
        // Fallback to monolithic API route if chunking fails
        console.warn('Chunked crawl encountered an issue, falling back to direct route:', clientErr);
        const fallbackRes = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, config }),
          signal: controller.signal,
        });

        if (!fallbackRes.ok) {
          const errData = await fallbackRes.json();
          throw new Error(errData.error || `Server responded with status ${fallbackRes.status}`);
        }

        const data = await fallbackRes.json();
        auditData = data.report;
      }

      setReport(auditData);
      setActiveTab('overview');
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
    <div className="min-h-full flex flex-col">
      {/* Error notification banner */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto mt-6 px-4 w-full">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-100 min-h-[44px]"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* State 1: Configuration Form */}
      {!report && !isLoading && (
        <AuditConfigForm onStartAudit={handleStartAudit} isLoading={isLoading} />
      )}

      {/* State 2: Crawl in Progress */}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
          {/* Active Audit Action Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  {report.targetDomain}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                  {report.targetNormalizedUrl}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Audited {report.auditDate} · {report.pages.length} pages analyzed · {report.findings.length} findings
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                isLoading={isGeneratingPdf}
                className="text-xs min-h-[44px]"
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                Download PDF
              </Button>

              <button
                onClick={() => setIsPrivacyModalOpen(true)}
                className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded border border-slate-200 transition-colors min-h-[44px]"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Privacy & Methodology
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAudit}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 min-h-[44px]"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                New Audit
              </Button>
            </div>
          </div>

          {/* Top Navigation Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-1 sm:space-x-6 overflow-x-auto py-1 scrollbar-thin">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'overview'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Overview
              </button>

              <button
                onClick={() => setActiveTab('findings')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'findings'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <ListFilter className="h-4 w-4 mr-1.5" />
                Findings <span className="ml-1 font-mono tabular-nums text-xs">({report.findings.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('urls')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'urls'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Globe2 className="h-4 w-4 mr-1.5" />
                URL Explorer <span className="ml-1 font-mono tabular-nums text-xs">({report.pages.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('aeo_geo')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'aeo_geo'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Layers className="h-4 w-4 mr-1.5" />
                AEO & GEO
              </button>

              <button
                onClick={() => setActiveTab('search')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'search'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Tag className="h-4 w-4 mr-1.5" />
                Keywords <span className="ml-1 font-mono tabular-nums text-xs">({report.keywordCandidates.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('roadmap')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'roadmap'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <CheckSquare className="h-4 w-4 mr-1.5" />
                Roadmap <span className="ml-1 font-mono tabular-nums text-xs">({report.roadMap.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'diagnostics'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Server className="h-4 w-4 mr-1.5" />
                Diagnostics <span className="ml-1 font-mono tabular-nums text-xs">({report.diagnostics?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('agent')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'agent'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Cpu className="h-4 w-4 mr-1.5 text-slate-700" />
                AI Agent (BYOK)
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors min-h-[44px] ${
                  activeTab === 'export'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Archive className="h-4 w-4 mr-1.5 text-slate-700" />
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
      )}

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
