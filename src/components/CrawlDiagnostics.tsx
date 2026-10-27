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
        return <ShieldAlert className="h-4 w-4 text-neon" />;
      case 'DNS_FAILURE':
        return <Globe className="h-4 w-4 text-amber-400" />;
      case 'TLS_ERROR':
        return <Lock className="h-4 w-4 text-cerulean" />;
      case 'TIMEOUT':
        return <Clock className="h-4 w-4 text-orange-400" />;
      case 'WAF_CHALLENGE':
        return <Server className="h-4 w-4 text-cerulean-300" />;
      case 'HTTP_4XX':
      case 'HTTP_5XX':
        return <AlertTriangle className="h-4 w-4 text-neon" />;
      default:
        return <XCircle className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Crawl Failure Banner if crawl failed */}
      {isCrawlFailed && (
        <Card className="p-4 sm:p-6 bg-rose-950/40 border border-neon/40 shadow-glow-rose">
          <div className="flex items-start space-x-3 sm:space-x-3.5">
            <XCircle className="h-6 w-6 text-neon shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-orbitron tracking-wide">
                Crawl Failed: Incomplete Audit
              </h3>
              <p className="text-xs text-rose-300 mt-1 leading-relaxed">
                {crawlFailureReason ||
                  'No pages could be successfully retrieved. In accordance with SearchScope engineering integrity standards, no audit score has been computed to prevent misleading evaluations.'}
              </p>
              <div className="mt-3 flex items-center space-x-2 text-xs font-mono font-semibold text-rose-400">
                <span>Attempted: {totalAttempted}</span>
                <span>•</span>
                <span>Successful: {successfulCount}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Diagnostics Table */}
      <Card className="overflow-hidden bg-jet-900 border-jet-800 shadow-xl">
        <div className="p-3.5 sm:p-4 border-b border-jet-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-jet-950/80">
          <div className="flex items-center space-x-2.5">
            <Server className="h-4 w-4 text-cerulean shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-orbitron">
              Network & Crawl Diagnostics ({diagnostics.length} Events)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {successfulCount} / {totalAttempted} URLs successfully analyzed
          </span>
        </div>

        {diagnostics.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-white text-sm font-rajdhani">Zero network or crawl errors detected.</p>
            <p className="text-slate-400 mt-1">All attempted pages completed cleanly without SSRF blocks, timeouts, or WAF interventions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-jet-800 text-left text-xs">
              <thead className="bg-jet-950 text-slate-400 font-rajdhani font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Error Type</th>
                  <th className="px-4 py-3">Affected URL</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Diagnostic Details & Hint</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jet-800/60 font-normal text-slate-300">
                {diagnostics.map((diag, idx) => (
                  <tr key={idx} className="hover:bg-jet-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getFailureIcon(diag.code)}
                        <span className="font-bold font-mono text-[11px] text-white">
                          {diag.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] max-w-xs truncate text-cerulean/80">
                      {diag.url}
                    </td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap">
                      <Badge variant="neutral">{diag.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="font-medium text-white">{diag.message}</div>
                      <div className="text-[11px] text-cerulean mt-0.5 font-mono">{diag.hint}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500 font-mono text-[10px]">
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
