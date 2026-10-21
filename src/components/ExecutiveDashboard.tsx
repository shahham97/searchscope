import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, FileDown, Layers, BarChart3 } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AuditReport, CategoryScore } from '../types/audit';

interface ExecutiveDashboardProps {
  report: AuditReport;
  onDownloadPdf: () => void;
  isGeneratingPdf: boolean;
  onSelectCategory?: (category: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  report,
  onDownloadPdf,
  isGeneratingPdf,
  onSelectCategory,
}) => {
  const criticalFindings = report.findings.filter((f) => f.severity === 'critical');
  const highFindings = report.findings.filter((f) => f.severity === 'high');

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
          <div className="flex items-center space-x-2.5 mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {report.targetDomain}
            </h1>
            <Badge variant={report.crawlStats.crawlBudgetExhausted ? 'informational' : 'success'}>
              {report.crawlStats.totalPagesCrawled} Pages Analyzed
            </Badge>
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
          </div>
        </div>

        <div className="flex items-center space-x-4 shrink-0">
          <div className={`flex flex-col items-center justify-center h-24 w-24 rounded-2xl border-2 ${getScoreColor(report.overallScore)}`}>
            <span className="text-3xl font-black">{report.overallScore}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Overall Score</span>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={onDownloadPdf}
            isLoading={isGeneratingPdf}
            className="shadow-md"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Critical Findings Alert Banner if any */}
      {criticalFindings.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="font-bold">{criticalFindings.length} Critical Issue{criticalFindings.length > 1 ? 's' : ''} Require Immediate Attention: </strong>
            <span>{criticalFindings.map((f) => f.title).join(' • ')}</span>
          </div>
        </div>
      )}

      {/* Category Scores Grid */}
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
                <span className={`text-base font-black ${cat.score >= 80 ? 'text-emerald-600' : cat.score >= 60 ? 'text-indigo-600' : 'text-amber-600'}`}>
                  {cat.score}/100
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 60 ? 'bg-indigo-500' : 'bg-amber-500'}`}
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
    </div>
  );
};
