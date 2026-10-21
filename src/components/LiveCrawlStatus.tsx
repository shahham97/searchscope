import React from 'react';
import { Loader2, XCircle, Globe, CheckCircle, AlertTriangle, FileText, FastForward } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface LiveCrawlStatusProps {
  status: string;
  currentUrl: string;
  crawledCount: number;
  discoveredCount: number;
  skippedCount?: number;
  failedCount?: number;
  maxPages: number;
  onCancel: () => void;
}

export const LiveCrawlStatus: React.FC<LiveCrawlStatusProps> = ({
  status,
  currentUrl,
  crawledCount,
  discoveredCount,
  skippedCount = 0,
  failedCount = 0,
  maxPages,
  onCancel,
}) => {
  const percentage = Math.min(100, Math.round((crawledCount / maxPages) * 100));

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Card className="p-8 border-slate-200/90 shadow-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Audit In Progress</h2>
              <p className="text-xs text-slate-500 font-mono truncate max-w-md">{currentUrl || 'Establishing secure connection...'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel} className="text-slate-600 hover:text-rose-600">
            <XCircle className="h-4 w-4 mr-1.5" />
            Abort Audit
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>{status}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>
        </div>

        {/* Counter Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-center text-indigo-600 mb-1">
              <FileText className="h-4 w-4 mr-1" />
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Crawled</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900">{crawledCount}</div>
            <div className="text-[10px] text-slate-400">Target: {maxPages}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-center text-blue-600 mb-1">
              <Globe className="h-4 w-4 mr-1" />
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Discovered</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900">{discoveredCount}</div>
            <div className="text-[10px] text-slate-400">In URL queue</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-center text-amber-600 mb-1">
              <FastForward className="h-4 w-4 mr-1" />
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Skipped</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900">{skippedCount}</div>
            <div className="text-[10px] text-slate-400">Robots or non-HTML</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-center text-rose-600 mb-1">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Failed</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900">{failedCount}</div>
            <div className="text-[10px] text-slate-400">HTTP 4xx/5xx/Timeout</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
