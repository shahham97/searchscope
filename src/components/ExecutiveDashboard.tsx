'use client';

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
  Zap,
  Activity,
  Cpu,
} from 'lucide-react';
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
  const criticalFindings = (report.findings || []).filter((f) => f.severity === 'critical');

  const getScoreBadgeStyles = (score: number) => {
    if (score >= 85) {
      return {
        border: 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
        text: 'text-emerald-400',
        glow: 'text-glow-emerald',
        label: 'OPTIMAL COMPLIANCE',
      };
    }
    if (score >= 70) {
      return {
        border: 'border-cerulean/70 shadow-glow-cerulean',
        text: 'text-cerulean',
        glow: 'text-glow-cerulean',
        label: 'SOLID ARCHITECTURE',
      };
    }
    if (score >= 50) {
      return {
        border: 'border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
        text: 'text-amber-400',
        glow: '',
        label: 'MODERATE GAPS',
      };
    }
    return {
      border: 'border-neon/80 shadow-glow-rose',
      text: 'text-neon',
      glow: 'text-glow-rose',
      label: 'CRITICAL ATTENTION',
    };
  };

  const scoreMeta = getScoreBadgeStyles(report.overallScore || 0);

  return (
    <div className="space-y-6">
      {/* Top Cyber Console Banner with Domain details & Score */}
      <div className="bg-jet-900/95 border border-jet-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-cyber-card relative overflow-hidden">
        {/* Glow corner accents */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-cerulean/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-neon/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="text-xl sm:text-3xl font-orbitron font-extrabold text-white tracking-wide break-all">
                {report.targetDomain}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-rajdhani font-bold uppercase tracking-wider bg-jet-850 text-cerulean border border-cerulean/40">
                {report.crawlStats?.successfulPagesCount || report.pages.length} / {report.crawlStats?.totalPagesCrawled || report.pages.length} Pages Crawled
              </span>
              {report.crawlStats?.aiBotsAudit && (
                <span className="px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-rajdhani font-bold uppercase tracking-wider bg-jet-850 text-neon border border-neon/40 flex items-center">
                  <Bot className="h-3 w-3 mr-1 text-neon shrink-0" />
                  {report.crawlStats.aiBotsAudit.filter((b) => b.allowed).length}/{report.crawlStats.aiBotsAudit.length} AI Bots Allowed
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-mono truncate bg-jet-950 px-3 py-1.5 rounded-lg border border-jet-800">
              <span className="text-cerulean">TARGET //</span> {report.targetNormalizedUrl}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs font-rajdhani font-semibold text-slate-400">
              <span className="truncate max-w-full">
                <strong className="text-slate-200">TITLE:</strong> {report.siteTitle || 'Declared in Head'}
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-200">DATE:</strong> {new Date(report.auditDate).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-200">CRAWL TIME:</strong> {((report.crawlStats?.crawlDurationMs || 0) / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Right: Score Gauge & Actions */}
          <div className="flex flex-col sm:flex-row md:flex-row items-center gap-4 w-full md:w-auto shrink-0">
            <div className="shrink-0">
              {report.isCrawlFailed ? (
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-neon/70 bg-neon/10 text-neon shadow-glow-rose">
                  <AlertTriangle className="h-8 w-8 text-neon mb-1 animate-pulse" />
                  <span className="text-xs font-orbitron font-bold uppercase">Crawl Blocked</span>
                  <button
                    type="button"
                    onClick={onOpenDiagnostics}
                    className="text-[11px] font-rajdhani font-bold text-cerulean underline mt-1"
                  >
                    Inspect Diagnostics
                  </button>
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 bg-jet-950/90 ${scoreMeta.border}`}
                >
                  <span className={`text-3xl sm:text-4xl font-orbitron font-extrabold ${scoreMeta.text}`}>
                    {report.overallScore}
                  </span>
                  <span className="text-[9px] font-rajdhani font-bold tracking-widest text-slate-400 uppercase mt-0.5">
                    OVERALL SCORE
                  </span>
                  <span className={`text-[8px] font-rajdhani font-bold tracking-wider ${scoreMeta.text} uppercase`}>
                    {scoreMeta.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-rajdhani font-bold text-xs uppercase tracking-wider bg-cerulean hover:bg-cerulean-glow text-jet-950 flex items-center justify-center shadow-glow-cerulean transition-all min-h-[44px]"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isGeneratingPdf ? 'Compiling PDF...' : 'Download PDF'}
              </button>

              <button
                type="button"
                onClick={onOpenExportCenter}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-rajdhani font-bold text-xs uppercase tracking-wider bg-jet-850 hover:bg-jet-800 text-white border border-jet-700 hover:border-neon flex items-center justify-center transition-all min-h-[44px]"
              >
                <Archive className="h-4 w-4 mr-2 text-neon" />
                Export Deliverables
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crawl Accounting & Discovery Balance */}
      <div className="bg-jet-900/90 border border-jet-800 rounded-2xl p-4 sm:p-6 shadow-cyber-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-jet-800 gap-2">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-cerulean" />
            <h2 className="text-xs sm:text-sm font-orbitron font-bold text-white uppercase tracking-wider">
              Crawl Accounting Balance
            </h2>
          </div>
          <span className="text-xs font-mono text-cerulean break-all">
            {report.crawlCoverage?.summary ||
              `${report.crawlStats?.totalPagesCrawled || 0} of ${report.crawlStats?.totalPagesDiscovered || 0} pages processed`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-center">
          <div className="p-3 rounded-xl bg-jet-950 border border-emerald-500/30">
            <span className="text-[10px] font-rajdhani font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">
              Crawled OK
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-white">
              {report.crawlStats?.successfulPagesCount ?? report.pages.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-jet-950 border border-amber-500/30">
            <span className="text-[10px] font-rajdhani font-bold text-amber-400 uppercase tracking-widest block mb-0.5">
              Hit Limit
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-white">
              {report.crawlStats?.notCrawledLimitCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-jet-950 border border-jet-800">
            <span className="text-[10px] font-rajdhani font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              Robots Skipped
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-white">
              {report.crawlStats?.skippedRobotsCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-jet-950 border border-jet-800">
            <span className="text-[10px] font-rajdhani font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              Non-HTML
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-white">
              {report.crawlStats?.skippedNonHtmlCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-jet-950 border border-neon/40">
            <span className="text-[10px] font-rajdhani font-bold text-neon uppercase tracking-widest block mb-0.5">
              Failed
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-white">
              {report.crawlStats?.totalPagesFailed || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-jet-950 border border-cerulean/40">
            <span className="text-[10px] font-rajdhani font-bold text-cerulean uppercase tracking-widest block mb-0.5">
              Total Discovered
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-white">
              {report.crawlStats?.totalPagesDiscovered || report.pages.length}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Findings Alert Banner if any */}
      {criticalFindings.length > 0 && (
        <div className="p-5 rounded-2xl bg-neon/10 border border-neon/50 flex items-start space-x-3.5 text-white shadow-glow-rose">
          <AlertCircle className="h-5 w-5 text-neon shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-sans space-y-1">
            <strong className="font-orbitron font-bold text-neon uppercase tracking-wide block">
              {criticalFindings.length} Critical Issue{criticalFindings.length > 1 ? 's' : ''} Require Immediate Remediation:
            </strong>
            <p className="text-slate-200">{criticalFindings.map((f) => f.title).join(' • ')}</p>
          </div>
        </div>
      )}

      {/* Dimension Scorecard Grid */}
      {!report.isCrawlFailed && (
        <div className="space-y-4">
          <h2 className="text-xs sm:text-sm font-orbitron font-bold uppercase tracking-wider text-white flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-cerulean" />
            Audit Dimension Breakdown
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(report.categoryScores || []).map((cat) => {
              const catScoreColor =
                cat.score >= 80 ? 'text-emerald-400' : cat.score >= 60 ? 'text-cerulean' : 'text-neon';
              const progressColor =
                cat.score >= 80 ? 'bg-emerald-400' : cat.score >= 60 ? 'bg-cerulean' : 'bg-neon';

              return (
                <div
                  key={cat.category}
                  onClick={() => onSelectCategory?.(cat.category)}
                  className="p-5 bg-jet-900/90 border border-jet-800 hover:border-cerulean/60 rounded-2xl shadow-cyber-card cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                      {cat.label}
                    </span>
                    <span className={`text-lg font-orbitron font-extrabold ${catScoreColor}`}>
                      {cat.score}/100
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-jet-950 rounded-full h-1.5 mb-3 overflow-hidden border border-jet-800">
                    <div
                      className={`h-1.5 rounded-full ${progressColor} transition-all duration-500`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-rajdhani text-slate-400">
                    <span>Weight: {Math.round(cat.weight * 100)}%</span>
                    <div className="flex space-x-2 font-mono">
                      {cat.findingsCount.critical > 0 && (
                        <span className="text-neon font-bold">{cat.findingsCount.critical} crit</span>
                      )}
                      {cat.findingsCount.high > 0 && (
                        <span className="text-amber-400 font-semibold">{cat.findingsCount.high} high</span>
                      )}
                      {cat.findingsCount.critical === 0 && cat.findingsCount.high === 0 && (
                        <span className="text-emerald-400 font-medium">Clean</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
