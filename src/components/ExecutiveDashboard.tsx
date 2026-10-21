import React from 'react';
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Layers,
  BarChart3,
  Archive,
  Bot,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AuditReport } from '../types/audit';

interface ExecutiveDashboardProps {
  report: AuditReport;
  onDownloadPdf: () => void;
  onOpenExportCenter: () => void;
  isGeneratingPdf: boolean;
  onSelectCategory?: (category: string) => void;
  onOpenDiagnostics?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  report,
  onDownloadPdf,
  onOpenExportCenter,
  isGeneratingPdf,
  onSelectCategory,
  onOpenDiagnostics,
}) => {
  const criticalFindings = report.findings.filter((f) => f.severity === 'critical');

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 border-emerald-500 bg-emerald-50';
    if (score >= 70) return 'text-indigo-600 border-indigo-500 bg-indigo-50';
    if (score >= 50) return 'text-amber-600 border-amber-500 bg-amber-50';
    return 'text-rose-600 border-rose-500 bg-rose-50';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Domain details & PDF Download */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {report.targetDomain}
            </h1>
            <Badge variant={report.isCrawlFailed ? 'critical' : 'success'}>
              {report.crawlStats.successfulPagesCount} / {report.crawlStats.totalPagesCrawled} Pages Analyzed
            </Badge>
            {report.crawlStats.aiBotsAudit && (
              <Badge variant="neutral">
                <Bot className="h-3 w-3 mr-1 text-indigo-600" />
                {report.crawlStats.aiBotsAudit.filter((b) => b.allowed).length}/{report.crawlStats.aiBotsAudit.length} AI Bots Allowed
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-mono truncate max-w-xl">
            {report.targetNormalizedUrl}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
            <span>
              <strong>Title:</strong> {report.siteTitle || 'N/A'}
            </span>
            <span>•</span>
            <span>
              <strong>Audited:</strong> {new Date(report.auditDate).toLocaleDateString()} {new Date(report.auditDate).toLocaleTimeString()}
            </span>
            <span>•</span>
            <span>
              <strong>Duration:</strong> {(report.crawlStats.crawlDurationMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {report.isCrawlFailed ? (
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-rose-300 bg-rose-50 text-rose-700">
              <AlertTriangle className="h-6 w-6 text-rose-600 mb-1" />
              <span className="text-xs font-bold uppercase">Crawl Failed</span>
              <button
                onClick={onOpenDiagnostics}
                className="text-[10px] text-indigo-700 underline font-semibold mt-1"
              >
                View Diagnostics
              </button>
            </div>
          ) : (
            <div
              className={`flex flex-col items-center justify-center h-24 w-24 rounded-2xl border-2 ${getScoreColor(
                report.overallScore
              )}`}
            >
              <span className="text-3xl font-black">{report.overallScore}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Overall Score</span>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button
              variant="primary"
              size="md"
              onClick={onDownloadPdf}
              isLoading={isGeneratingPdf}
              className="shadow-sm text-xs"
            >
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onOpenExportCenter}
              className="shadow-sm text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
              Export Bundle (ZIP)
            </Button>
          </div>
        </div>
      </div>

      {/* Crawl Accounting & Transparency Breakdown */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Crawl Accounting & Discovery Balance
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {report.crawlCoverage?.summary ||
              `${report.crawlStats.totalPagesCrawled} of ${report.crawlStats.totalPagesDiscovered} discovered pages processed`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase block mb-0.5">Crawled OK</span>
            <span className="text-xl font-black text-emerald-600">{report.crawlStats.successfulPagesCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
            <span className="text-[10px] font-semibold text-amber-800 uppercase block mb-0.5">Hit Crawl Limit</span>
            <span className="text-xl font-black text-amber-600">{report.crawlStats.notCrawledLimitCount || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-700 uppercase block mb-0.5">Skipped (Robots)</span>
            <span className="text-xl font-black text-slate-600">{report.crawlStats.skippedRobotsCount || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-700 uppercase block mb-0.5">Skipped (Non-HTML)</span>
            <span className="text-xl font-black text-slate-600">{report.crawlStats.skippedNonHtmlCount || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
            <span className="text-[10px] font-semibold text-rose-800 uppercase block mb-0.5">Failed Fetches</span>
            <span className="text-xl font-black text-rose-600">{report.crawlStats.totalPagesFailed}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-[10px] font-semibold text-indigo-800 uppercase block mb-0.5">Total Discovered</span>
            <span className="text-xl font-black text-indigo-600">{report.crawlStats.totalPagesDiscovered}</span>
          </div>
        </div>
      </div>

      {/* Critical Findings Alert Banner if any */}
      {criticalFindings.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="font-bold">
              {criticalFindings.length} Critical Issue{criticalFindings.length > 1 ? 's' : ''} Require Immediate Attention:{' '}
            </strong>
            <span>{criticalFindings.map((f) => f.title).join(' • ')}</span>
          </div>
        </div>
      )}

      {/* Category Scores Grid */}
      {!report.isCrawlFailed && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-1.5 text-indigo-600" />
            Audit Dimension Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.categoryScores.map((cat) => (
              <Card
                key={cat.category}
                onClick={() => onSelectCategory?.(cat.category)}
                className="p-4 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">{cat.label}</span>
                  <span
                    className={`text-base font-black ${
                      cat.score >= 80
                        ? 'text-emerald-600'
                        : cat.score >= 60
                        ? 'text-indigo-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {cat.score}/100
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 60 ? 'bg-indigo-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weight: {Math.round(cat.weight * 100)}%</span>
                  <div className="flex space-x-1.5">
                    {cat.findingsCount.critical > 0 && (
                      <span className="text-rose-600 font-bold">{cat.findingsCount.critical} crit</span>
                    )}
                    {cat.findingsCount.high > 0 && (
                      <span className="text-amber-600 font-semibold">{cat.findingsCount.high} high</span>
                    )}
                    {cat.findingsCount.critical === 0 && cat.findingsCount.high === 0 && (
                      <span className="text-emerald-600 font-medium">Clean</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
