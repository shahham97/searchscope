'use client';

import React, { useState, useEffect } from 'react';
import { Disc3, Volume2, Radio, Play, Sparkles, Network, Zap, Layers, Music, Sliders } from 'lucide-react';

/**
 * Interactive full-page Retro Parallax Backdrop with warm analogue warmth,
 * tape-particle perspective shift, and ambient Retro Orange & Cassette Teal light.
 */
export const CyberParallaxBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 24;
      const y = (e.clientY / innerHeight - 0.5) * 24;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-full w-full overflow-hidden">
      {/* Warm Retro Analogue Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Retro Grid */}
        <div
          className="absolute inset-0 bg-retro-grid opacity-30 transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mouseOffset.x * 0.3}px, ${mouseOffset.y * 0.3}px) scale(1.02)`,
          }}
        />

        {/* Ambient Floating Glow Orb 1 - Retro Tangerine Orange */}
        <div
          className="absolute -top-28 -left-28 w-[580px] h-[580px] bg-retro-orange/15 rounded-full blur-[140px] transition-transform duration-500 ease-out"
          style={{
            transform: `translate(${-mouseOffset.x * 1.5}px, ${-mouseOffset.y * 1.5}px)`,
          }}
        />

        {/* Ambient Floating Glow Orb 2 - Vintage Cassette Teal */}
        <div
          className="absolute top-1/3 -right-28 w-[560px] h-[560px] bg-retro-teal/15 rounded-full blur-[150px] transition-transform duration-500 ease-out"
          style={{
            transform: `translate(${mouseOffset.x * 1.5}px, ${mouseOffset.y * 1.5}px)`,
          }}
        />

        {/* Ambient Center Orb - Warm Amber Paper Warmth */}
        <div
          className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] transition-transform duration-700 ease-out"
          style={{
            transform: `translate(${mouseOffset.x * 0.8}px, ${mouseOffset.y * 0.8}px)`,
          }}
        />

        {/* Floating Analogue Tape Dust & Reel Particles */}
        <div
          className="absolute top-24 left-[14%] w-2 h-2 rounded-full bg-retro-orange shadow-[0_0_8px_#FF5A1F] transition-transform duration-300"
          style={{ transform: `translate(${mouseOffset.x * 1.1}px, ${mouseOffset.y * 1.1}px)` }}
        />
        <div
          className="absolute top-52 right-[18%] w-2.5 h-2.5 rounded-full bg-retro-teal shadow-[0_0_10px_#1C8A8A] transition-transform duration-300"
          style={{ transform: `translate(${-mouseOffset.x * 1.3}px, ${-mouseOffset.y * 1.3}px)` }}
        />
        <div
          className="absolute top-3/4 left-[8%] w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#E5A00D] transition-transform duration-200"
          style={{ transform: `translate(${mouseOffset.x * 1.8}px, ${mouseOffset.y * 1.8}px)` }}
        />
        <div
          className="absolute top-2/3 right-[10%] w-2 h-2 rounded-full bg-retro-orange shadow-[0_0_8px_#FF5A1F] transition-transform duration-200"
          style={{ transform: `translate(${-mouseOffset.x * 1.8}px, ${-mouseOffset.y * 1.8}px)` }}
        />
      </div>

      {/* Main Content with Foreground z-index */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/**
 * 3D Interactive Vintage Cassette Tape ("Retro Radiance" Aesthetic)
 * Matches the orange cassette tape and vintage editorial aesthetic in the reference reel.
 */
export const CyberSeoHeroVisual: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 22;
      const y = (e.clientY / innerHeight - 0.5) * 22;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-jet-900 to-jet-950 border border-retro-charcoal-border shadow-2xl p-4">
      {/* Dynamic Parallax Backdrops */}
      <div
        className="absolute inset-0 bg-retro-grid-dense opacity-40 transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px) scale(1.04)`,
        }}
      />

      {/* Retro Orange Glow Orb */}
      <div
        className="absolute w-64 h-64 bg-retro-orange/20 rounded-full blur-[80px] pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${-mousePos.x * 1.4 - 25}px, ${-mousePos.y * 1.4 - 25}px)`,
        }}
      />

      {/* Retro Teal Glow Orb */}
      <div
        className="absolute w-64 h-64 bg-retro-teal/20 rounded-full blur-[80px] pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${mousePos.x * 1.4 + 25}px, ${mousePos.y * 1.4 + 25}px)`,
        }}
      />

      {/* 3D Tilting Vintage Cassette Unit */}
      <div
        className="relative z-10 w-full max-w-sm aspect-[1.58/1] transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(1000px) rotateY(${mousePos.x * 0.9}deg) rotateX(${-mousePos.y * 0.9}deg)`,
        }}
      >
        {/* Cassette Main Body (Vibrant Retro Tangerine Orange) */}
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#FF5A1F] to-[#E64A14] border-2 border-[#181716] shadow-2xl p-3.5 flex flex-col justify-between overflow-hidden">
          {/* Subtle Cassette Texture Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)] pointer-events-none" />

          {/* 4 Corner Chrome Screws */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#FAF6F0] border border-[#181716] shadow-sm flex items-center justify-center">
            <div className="w-1 h-[0.5px] bg-[#181716]" />
          </div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FAF6F0] border border-[#181716] shadow-sm flex items-center justify-center">
            <div className="w-1 h-[0.5px] bg-[#181716]" />
          </div>
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#FAF6F0] border border-[#181716] shadow-sm flex items-center justify-center">
            <div className="w-1 h-[0.5px] bg-[#181716]" />
          </div>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#FAF6F0] border border-[#181716] shadow-sm flex items-center justify-center">
            <div className="w-1 h-[0.5px] bg-[#181716]" />
          </div>

          {/* Top Label Banner (Vintage Cream) */}
          <div className="bg-[#FAF6F0] rounded-lg px-3 py-1.5 border border-[#181716] shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
              <span className="font-retro font-extrabold text-[11px] tracking-widest text-[#181716] uppercase">
                SEARCHSCOPE 90
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[9px] font-mono font-bold text-[#1C8A8A]">
              <span>SIDE A</span>
              <span>•</span>
              <span className="text-[#FF5A1F]">STEREO HI-FI</span>
            </div>
          </div>

          {/* Center Cassette Spool Window */}
          <div className="relative mx-auto w-[82%] h-24 bg-[#141312] rounded-xl border border-[#2D2A26] flex items-center justify-between px-6 overflow-hidden shadow-inner">
            {/* Left Spool (Rotates) */}
            <div className="relative w-12 h-12 rounded-full bg-[#FAF6F0] border-2 border-[#181716] flex items-center justify-center shadow-md animate-spin-slow">
              <div className="w-4 h-4 rounded-full bg-[#141312] border border-[#332F2B] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
              </div>
              {/* Spool Teeth */}
              <div className="absolute w-full h-[1.5px] bg-[#181716]" />
              <div className="absolute w-[1.5px] h-full bg-[#181716]" />
            </div>

            {/* Magnetic Tape Ribbon & Tape Head Bridge */}
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <div className="w-full h-3 bg-[#69402C] rounded-sm border border-[#181716] shadow-inner mb-1 flex items-center justify-center">
                <span className="text-[7px] font-mono text-[#D4A373] tracking-widest">
                  ||||||||||||||||||||||
                </span>
              </div>
              <span className="font-serif italic text-xs text-[#FAF6F0] tracking-wide">
                Vintage Cassette
              </span>
              <span className="text-[8px] font-mono text-[#FF7A45] tracking-widest uppercase">
                100% TRANS-MEMORY
              </span>
            </div>

            {/* Right Spool (Rotates Reverse) */}
            <div className="relative w-12 h-12 rounded-full bg-[#FAF6F0] border-2 border-[#181716] flex items-center justify-center shadow-md animate-spin-reverse">
              <div className="w-4 h-4 rounded-full bg-[#141312] border border-[#332F2B] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1C8A8A]" />
              </div>
              {/* Spool Teeth */}
              <div className="absolute w-full h-[1.5px] bg-[#181716]" />
              <div className="absolute w-[1.5px] h-full bg-[#181716]" />
            </div>
          </div>

          {/* Bottom Cassette Playhead Trapezoid */}
          <div className="bg-[#E64A14] rounded-md px-3 py-1 border border-[#181716] flex items-center justify-between text-[8px] font-mono text-[#FAF6F0]">
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FAF6F0]" />
              <span>TYPE I · NORMAL BIAS</span>
            </div>
            <span className="font-serif italic text-[10px] text-white">Retro Radiance</span>
            <div className="flex items-center space-x-1.5">
              <span>SEO · AEO · GEO</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C8A8A]" />
            </div>
          </div>
        </div>
      </div>

      {/* Retro Floating Badge: "Vintage Cassette · Retro Radiance" */}
      <div className="absolute bottom-3 left-4 right-4 bg-[#FAF6F0]/95 border border-[#181716] rounded-xl py-1.5 px-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
          <span className="font-retro font-bold text-xs text-[#181716]">
            Retro Radiance: Timeless Style
          </span>
        </div>
        <span className="font-serif italic text-xs text-[#FF5A1F]">
          Analogue Precision 1982
        </span>
      </div>
    </div>
  );
};

/**
 * Vintage Reel-to-Reel Tape Recorder during active crawl
 */
export const LiveCrawlParallaxVisual: React.FC<{ currentUrl: string; percentage: number }> = ({
  currentUrl,
  percentage,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20;
      const y = (e.clientY / innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square flex items-center justify-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-jet-900 to-jet-950 border border-retro-orange/40 shadow-retro-orange mb-8 p-4">
      {/* Background warm radial pulse */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,90,31,0.18)_0,transparent_70%)] transition-transform duration-300"
        style={{ transform: `translate(${mousePos.x * 0.7}px, ${mousePos.y * 0.7}px)` }}
      />

      {/* Vintage Cassette Recorder Deck in Action */}
      <div
        className="relative w-64 h-64 rounded-2xl bg-[#181716] border-2 border-retro-orange/50 p-4 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(800px) rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg)`,
        }}
      >
        {/* Top Deck Telemetry Bar */}
        <div className="flex items-center justify-between border-b border-jet-800 pb-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-retro-orange animate-ping" />
            <span className="font-mono text-[10px] font-bold text-retro-orange uppercase">
              REC ● [00:24]
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-3 bg-emerald-400 rounded-xs animate-vu-1" />
            <div className="w-1.5 h-4 bg-emerald-400 rounded-xs animate-vu-2" />
            <div className="w-1.5 h-5 bg-amber-400 rounded-xs animate-vu-3" />
            <div className="w-1.5 h-6 bg-retro-orange rounded-xs animate-vu-4" />
          </div>
        </div>

        {/* Dual Spinning Cassette Spools */}
        <div className="flex items-center justify-between px-3 py-2">
          {/* Spool 1 */}
          <div className="relative w-16 h-16 rounded-full bg-[#FAF6F0] border-2 border-retro-orange flex items-center justify-center shadow-md animate-spin-slow">
            <div className="w-6 h-6 rounded-full bg-[#181716] border border-jet-700 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-retro-orange" />
            </div>
            <div className="absolute w-full h-[1.5px] bg-[#181716]" />
            <div className="absolute w-[1.5px] h-full bg-[#181716]" />
          </div>

          {/* Magnetic Ribbon Path */}
          <div className="flex-1 flex flex-col items-center justify-center px-2">
            <div className="w-full h-2.5 bg-[#69402C] rounded-xs border border-jet-800 shadow-inner mb-1" />
            <span className="font-serif italic text-xs text-retro-cream">
              Recording DOM
            </span>
            <span className="font-mono text-[10px] text-retro-orange font-bold">
              {percentage}%
            </span>
          </div>

          {/* Spool 2 */}
          <div className="relative w-16 h-16 rounded-full bg-[#FAF6F0] border-2 border-retro-teal flex items-center justify-center shadow-md animate-spin-reverse">
            <div className="w-6 h-6 rounded-full bg-[#181716] border border-jet-700 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-retro-teal" />
            </div>
            <div className="absolute w-full h-[1.5px] bg-[#181716]" />
            <div className="absolute w-[1.5px] h-full bg-[#181716]" />
          </div>
        </div>

        {/* Bottom Status Ribbon */}
        <div className="border-t border-jet-800 pt-2 flex items-center justify-between text-[10px] font-mono">
          <span className="text-emerald-400">TLS // OK</span>
          <span className="text-slate-400 truncate max-w-[120px]">
            {currentUrl ? new URL(currentUrl).hostname : 'CONNECTING'}
          </span>
          <span className="text-retro-orange font-bold">HI-FI // 200</span>
        </div>
      </div>

      <div className="absolute bottom-3 inset-x-0 text-center font-retro text-[10px] tracking-widest text-slate-400 uppercase">
        ANALOGUE TAPE TELEMETRY DECK
      </div>
    </div>
  );
};

export const CyberFeatureSectionVisual: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
      {/* Card 1: Technical & PageRank */}
      <div className="relative group p-6 rounded-2xl bg-jet-900/90 border border-jet-800 hover:border-retro-orange/60 transition-all duration-300 shadow-retro-card hover:shadow-retro-orange overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-retro-orange/10 rounded-full blur-2xl group-hover:bg-retro-orange/20 transition-all pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-jet-850 border border-retro-orange/40 flex items-center justify-center text-retro-orange shadow-sm group-hover:scale-110 transition-transform">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-retro font-bold text-sm text-white group-hover:text-glow-orange transition-all">
              PageRank Link Graph
            </h3>
            <span className="text-[10px] font-serif italic text-retro-orange tracking-wide">
              Power Iteration · Click Depth
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Constructs the full internal link adjacency graph, calculating exact authority flow across 20 iterations, identifying orphan nodes and crawl traps.
        </p>
        <div className="mt-4 pt-3 border-t border-jet-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
          <span className="text-retro-orange">d = 0.85 DAMPING</span>
          <span className="text-slate-400">BFS DEPTH MATRIX</span>
        </div>
      </div>

      {/* Card 2: AEO & Answer Engines */}
      <div className="relative group p-6 rounded-2xl bg-jet-900/90 border border-jet-800 hover:border-retro-teal/60 transition-all duration-300 shadow-retro-card hover:shadow-glow-rose overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-retro-teal/10 rounded-full blur-2xl group-hover:bg-retro-teal/20 transition-all pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-jet-850 border border-retro-teal/40 flex items-center justify-center text-retro-teal shadow-sm group-hover:scale-110 transition-transform">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-retro font-bold text-sm text-white group-hover:text-glow-teal transition-all">
              AEO & GEO Readiness
            </h3>
            <span className="text-[10px] font-serif italic text-retro-teal tracking-wide">
              AI Overviews · Perplexity
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Evaluates conversational heading questions, direct definition extraction blocks, table matrices, and <code className="text-retro-teal font-mono">/llms.txt</code> machine-readable files.
        </p>
        <div className="mt-4 pt-3 border-t border-jet-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
          <span className="text-retro-teal">SYNTACTIC Q&A</span>
          <span className="text-slate-400">LLM PARITY CHECK</span>
        </div>
      </div>

      {/* Card 3: 64-bit SimHash Deduplication */}
      <div className="relative group p-6 rounded-2xl bg-jet-900/90 border border-jet-800 hover:border-retro-orange/60 transition-all duration-300 shadow-retro-card hover:shadow-retro-orange overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-retro-orange/10 rounded-full blur-2xl group-hover:bg-retro-orange/20 transition-all pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-jet-850 border border-retro-orange/40 flex items-center justify-center text-retro-orange shadow-sm group-hover:scale-110 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-retro font-bold text-sm text-white group-hover:text-glow-orange transition-all">
              64-bit SimHash Shingling
            </h3>
            <span className="text-[10px] font-serif italic text-retro-orange tracking-wide">
              Charikar Algorithm · Near-Duplicates
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Clusters duplicate documents using 3-word shingles and bitwise Hamming distance computation, discovering cannibalized pages and boilerplate overlap.
        </p>
        <div className="mt-4 pt-3 border-t border-jet-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
          <span className="text-retro-orange">HAMMING DIST &le; 7</span>
          <span className="text-slate-400">&ge; 85% OVERLAP</span>
        </div>
      </div>
    </div>
  );
};
