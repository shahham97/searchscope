'use client';

import React, { useState, useRef } from 'react';
import {
  BarChart3,
  ListFilter,
  Globe2,
  Sparkles,
  Tag,
  CheckSquare,
  FileDown,
  AlertCircle,
  RotateCcw,
  Archive,
  Server,
  Bot,
} from 'lucide-react';
import { AuditHeader } from '@/components/AuditHeader';
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
          const data = await fallbackRes.json().catch(() => ({}));
          throw new Error(data.error || `Server responded with HTTP ${fallbackRes.status}`);
        }
        auditData = await fallbackRes.json();
      }

      setReport(auditData);

      if (auditData.isCrawlFailed) {
        setActiveTab('diagnostics');
      } else {
        setActiveTab('overview');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMessage('Audit was cancelled by the user.');
      } else {
        const msg = err instanceof Error ? err.message : 'An error occurred during the audit.';
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelAudit = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearAudit = () => {
    setReport(null);
    setErrorMessage(null);
    setIsLoading(false);
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <AuditHeader
        hasActiveAudit={Boolean(report)}
        onClearAudit={handleClearAudit}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
      />

      <main className="flex-1 pb-16">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto mt-6 px-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setErrorMessage(null)}
                className="text-xs text-rose-700 border-rose-300 hover:bg-rose-100"
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
            {/* Top Navigation Tabs */}
            <div className="border-b border-slate-200">
              <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto py-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'overview'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab('findings')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'findings'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <ListFilter className="h-4 w-4 mr-2" />
                  Findings ({report.findings.length})
                </button>

                <button
                  onClick={() => setActiveTab('urls')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'urls'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Globe2 className="h-4 w-4 mr-2" />
                  URL Explorer ({report.pages.length})
                </button>

                <button
                  onClick={() => setActiveTab('aeo_geo')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'aeo_geo'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AEO & GEO
                </button>

                <button
                  onClick={() => setActiveTab('search')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'search'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Keywords ({report.keywordCandidates.length})
                </button>

                <button
                  onClick={() => setActiveTab('roadmap')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'roadmap'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Roadmap ({report.roadMap.length})
                </button>

                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'diagnostics'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Server className="h-4 w-4 mr-2" />
                  Diagnostics ({report.diagnostics?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('agent')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'agent'
                      ? 'border-purple-600 text-purple-600 font-bold'
                      : 'border-transparent text-purple-600 hover:text-purple-800 hover:border-purple-300'
                  }`}
                >
                  <Bot className="h-4 w-4 mr-2 text-purple-600" />
                  AI Agent
                </button>

                <button
                  onClick={() => setActiveTab('export')}
                  className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap transition-colors ${
                    activeTab === 'export'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-indigo-600 hover:text-indigo-800 hover:border-indigo-300'
                  }`}
                >
                  <Archive className="h-4 w-4 mr-2 text-indigo-600" />
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
      </main>

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
