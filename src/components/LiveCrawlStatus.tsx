'use client';

import React from 'react';
import { Loader2, XCircle, Globe, AlertTriangle, FileText, FastForward, Activity } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="p-8 rounded-3xl bg-jet-900/95 border border-cerulean/50 shadow-glow-cerulean relative overflow-hidden backdrop-blur-xl">
        {/* Glow corner ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cerulean/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-jet-850 border border-cerulean/60 flex items-center justify-center text-cerulean shadow-[0_0_20px_rgba(0,168,255,0.4)]">
              <Loader2 className="h-6 w-6 animate-spin text-cerulean" />
            </div>
            <div>
              <h2 className="text-lg font-orbitron font-extrabold text-white tracking-wide">
                AUTONOMOUS CRAWL IN PROGRESS
              </h2>
              <p className="text-xs text-slate-300 font-mono truncate max-w-md mt-0.5">
                <span className="text-cerulean">SCAN //</span> {currentUrl || 'Establishing secure TLS connection...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-rajdhani font-bold uppercase tracking-wider text-neon hover:text-white bg-jet-950 hover:bg-neon/20 border border-neon/50 hover:border-neon transition-all flex items-center min-h-[44px]"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Abort Audit
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2.5 mb-8 relative z-10">
          <div className="flex justify-between text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300">
            <span className="text-cerulean flex items-center">
              <Activity className="h-3.5 w-3.5 mr-1.5 animate-pulse text-neon" />
              {status}
            </span>
            <span className="font-orbitron font-bold text-white text-sm">{percentage}%</span>
          </div>
          <div className="w-full bg-jet-950 rounded-full h-3.5 overflow-hidden border border-jet-800 p-0.5">
            <div
              className="bg-gradient-to-r from-cerulean via-cerulean-light to-neon h-full rounded-full transition-all duration-300 ease-out shadow-glow-cerulean"
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>
        </div>

        {/* Counter Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-jet-800 text-center relative z-10">
          <div className="p-3.5 bg-jet-950 rounded-2xl border border-jet-800">
            <div className="flex items-center justify-center text-cerulean mb-1">
              <FileText className="h-4 w-4 mr-1 text-cerulean" />
              <span className="text-[11px] font-rajdhani uppercase font-bold tracking-widest text-slate-400">
                Crawled
              </span>
            </div>
            <div className="text-2xl font-orbitron font-extrabold text-white">{crawledCount}</div>
            <div className="text-[10px] font-mono text-slate-500">Target: {maxPages}</div>
          </div>

          <div className="p-3.5 bg-jet-950 rounded-2xl border border-jet-800">
            <div className="flex items-center justify-center text-cerulean mb-1">
              <Globe className="h-4 w-4 mr-1 text-cerulean" />
              <span className="text-[11px] font-rajdhani uppercase font-bold tracking-widest text-slate-400">
                Discovered
              </span>
            </div>
            <div className="text-2xl font-orbitron font-extrabold text-white">{discoveredCount}</div>
            <div className="text-[10px] font-mono text-slate-500">In Queue</div>
          </div>

          <div className="p-3.5 bg-jet-950 rounded-2xl border border-jet-800">
            <div className="flex items-center justify-center text-slate-300 mb-1">
              <FastForward className="h-4 w-4 mr-1 text-slate-400" />
              <span className="text-[11px] font-rajdhani uppercase font-bold tracking-widest text-slate-400">
                Skipped
              </span>
            </div>
            <div className="text-2xl font-orbitron font-extrabold text-white">{skippedCount}</div>
            <div className="text-[10px] font-mono text-slate-500">Robots / Media</div>
          </div>

          <div className="p-3.5 bg-jet-950 rounded-2xl border border-neon/40">
            <div className="flex items-center justify-center text-neon mb-1">
              <AlertTriangle className="h-4 w-4 mr-1 text-neon" />
              <span className="text-[11px] font-rajdhani uppercase font-bold tracking-widest text-neon">
                Failed
              </span>
            </div>
            <div className="text-2xl font-orbitron font-extrabold text-white">{failedCount}</div>
            <div className="text-[10px] font-mono text-slate-500">4xx / 5xx / Timeout</div>
          </div>
        </div>
      </div>
    </div>
  );
};
