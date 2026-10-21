import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Server,
  Clock,
  Globe,
  Lock,
  FileQuestion,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { CrawlDiagnostic, FailureCode } from '../types/audit';

interface CrawlDiagnosticsProps {
  diagnostics: CrawlDiagnostic[];
  isCrawlFailed?: boolean;
  crawlFailureReason?: string;
  successfulCount: number;
  totalAttempted: number;
}

export const CrawlDiagnostics: React.FC<CrawlDiagnosticsProps> = ({
  diagnostics,
  isCrawlFailed,
  crawlFailureReason,
  successfulCount,
  totalAttempted,
}) => {
  const getFailureIcon = (code: FailureCode) => {
    switch (code) {
      case 'SSRF_BLOCKED':
        return <ShieldAlert className="h-4 w-4 text-rose-600" />;
      case 'DNS_FAILURE':
        return <Globe className="h-4 w-4 text-amber-600" />;
      case 'TLS_ERROR':
        return <Lock className="h-4 w-4 text-purple-600" />;
      case 'TIMEOUT':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'WAF_CHALLENGE':
        return <Server className="h-4 w-4 text-indigo-600" />;
      case 'HTTP_4XX':
      case 'HTTP_5XX':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      default:
        return <XCircle className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Crawl Failure Banner if crawl failed */}
      {isCrawlFailed && (
        <Card className="p-6 bg-rose-50 border-rose-200">
          <div className="flex items-start space-x-3">
            <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-rose-900">
                Crawl Failed: Incomplete Audit
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {crawlFailureReason ||
                  'No pages could be successfully retrieved. In accordance with SearchScope engineering integrity standards, no audit score has been computed to prevent misleading evaluations.'}
              </p>
              <div className="mt-3 flex items-center space-x-2 text-xs font-semibold text-rose-700">
                <span>Attempted: {totalAttempted}</span>
                <span>•</span>
                <span>Successful: {successfulCount}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Diagnostics Table */}
      <Card className="overflow-hidden bg-white border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Network & Crawl Diagnostics ({diagnostics.length} Events)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {successfulCount} / {totalAttempted} URLs successfully analyzed
          </span>
        </div>

        {diagnostics.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-900">Zero network or crawl errors detected.</p>
            <p>All attempted pages completed cleanly without SSRF blocks, timeouts, or WAF interventions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Error Type</th>
                  <th className="px-4 py-3">Affected URL</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Diagnostic Details & Hint</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {diagnostics.map((diag, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        {getFailureIcon(diag.code)}
                        <span className="font-bold font-mono text-[11px]">
                          {diag.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] max-w-xs truncate">
                      {diag.url}
                    </td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap">
                      <Badge variant="neutral">{diag.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-900">{diag.message}</div>
                      <div className="text-[11px] text-indigo-700 mt-0.5">{diag.hint}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-400 font-mono text-[10px]">
                      {new Date(diag.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
