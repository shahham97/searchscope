'use client';

import React from 'react';
import { Loader2, XCircle, Globe, AlertTriangle, FileText, FastForward, Activity } from 'lucide-react';
import { LiveCrawlParallaxVisual } from './ui/CyberSeoVisuals';

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
    <div className="max-w-4xl mx-auto py-6 sm:py-12 px-3 sm:px-4">
      {/* 3D Parallax Live Radar Telemetry */}
      <LiveCrawlParallaxVisual currentUrl={currentUrl} percentage={percentage} />

      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-jet-900/95 border border-cerulean/50 shadow-glow-cerulean relative overflow-hidden backdrop-blur-xl">
        {/* Glow corner ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cerulean/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-jet-850 border border-retro-orange/60 flex items-center justify-center text-retro-orange shadow-retro-orange shrink-0">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-retro-orange" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-retro font-black text-white tracking-wide truncate">
                AUTONOMOUS TAPE AUDIT IN PROGRESS
              </h2>
              <p className="text-xs text-slate-300 font-mono truncate max-w-xs sm:max-w-md mt-0.5">
                <span className="text-retro-orange font-bold">REC TAPE //</span> {currentUrl || 'Establishing secure TLS connection...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-retro font-bold uppercase tracking-wider text-retro-orange hover:text-white bg-jet-950 hover:bg-retro-orange/20 border border-retro-orange/50 hover:border-retro-orange transition-all flex items-center justify-center min-h-[44px] shrink-0"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Stop Tape
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6 sm:mb-8 relative z-10">
          <div className="flex justify-between items-center text-xs font-retro font-bold uppercase tracking-wider text-slate-300">
            <span className="text-retro-orange flex items-center truncate max-w-[75%]">
              <Activity className="h-3.5 w-3.5 mr-1.5 animate-pulse text-retro-orange shrink-0" />
              <span className="truncate">{status}</span>
            </span>
            <span className="font-retro font-bold text-white text-xs sm:text-sm shrink-0">{percentage}%</span>
          </div>
          <div className="w-full bg-jet-950 rounded-full h-3 sm:h-3.5 overflow-hidden border border-jet-800 p-0.5">
            <div
              className="bg-gradient-to-r from-retro-orange via-amber-400 to-retro-teal h-full rounded-full transition-all duration-300 ease-out shadow-retro-orange"
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>
        </div>

        {/* Counter Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-5 sm:pt-6 border-t border-jet-800 text-center relative z-10">
          <div className="p-3 sm:p-3.5 bg-jet-950 rounded-xl sm:rounded-2xl border border-jet-800">
            <div className="flex items-center justify-center text-cerulean mb-1">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 text-cerulean" />
              <span className="text-[10px] sm:text-[11px] font-rajdhani uppercase font-bold tracking-wider sm:tracking-widest text-slate-400">
                Crawled
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-orbitron font-extrabold text-white">{crawledCount}</div>
            <div className="text-[10px] font-mono text-slate-500">Target: {maxPages}</div>
          </div>

          <div className="p-3 sm:p-3.5 bg-jet-950 rounded-xl sm:rounded-2xl border border-jet-800">
            <div className="flex items-center justify-center text-cerulean mb-1">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 text-cerulean" />
              <span className="text-[10px] sm:text-[11px] font-rajdhani uppercase font-bold tracking-wider sm:tracking-widest text-slate-400">
                Discovered
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-orbitron font-extrabold text-white">{discoveredCount}</div>
            <div className="text-[10px] font-mono text-slate-500">In Queue</div>
          </div>

          <div className="p-3 sm:p-3.5 bg-jet-950 rounded-xl sm:rounded-2xl border border-jet-800">
            <div className="flex items-center justify-center text-slate-300 mb-1">
              <FastForward className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 text-slate-400" />
              <span className="text-[10px] sm:text-[11px] font-rajdhani uppercase font-bold tracking-wider sm:tracking-widest text-slate-400">
                Skipped
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-orbitron font-extrabold text-white">{skippedCount}</div>
            <div className="text-[10px] font-mono text-slate-500">Robots / Media</div>
          </div>

          <div className="p-3 sm:p-3.5 bg-jet-950 rounded-xl sm:rounded-2xl border border-neon/40">
            <div className="flex items-center justify-center text-neon mb-1">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 text-neon" />
              <span className="text-[10px] sm:text-[11px] font-rajdhani uppercase font-bold tracking-wider sm:tracking-widest text-neon">
                Failed
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-orbitron font-extrabold text-white">{failedCount}</div>
            <div className="text-[10px] font-mono text-slate-500">4xx / 5xx / Timeout</div>
          </div>
        </div>
      </div>
    </div>
  );
};
