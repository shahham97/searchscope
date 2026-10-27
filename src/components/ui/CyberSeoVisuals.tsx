'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Search, Globe, Shield, Terminal, Zap, Layers, Network, Activity, Radio, Sparkles } from 'lucide-react';

/**
 * Interactive full-page Cyber Parallax Backdrop with multi-depth particles,
 * laser grid perspective shift, and ambient Cerulean / Neon Rose light beams.
 */
export const CyberParallaxBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 30;
      const y = (e.clientY / innerHeight - 0.5) * 30;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-full w-full overflow-hidden">
      {/* Deep Space Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Cyber perspective grid */}
        <div
          className="absolute inset-0 bg-cyber-grid opacity-25 transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4}px) scale(1.02)`,
          }}
        />

        {/* Ambient Floating Glow Orb 1 - Cerulean Blue */}
        <div
          className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-cerulean/15 rounded-full blur-[140px] transition-transform duration-500 ease-out"
          style={{
            transform: `translate(${-mouseOffset.x * 1.8}px, ${-mouseOffset.y * 1.8}px)`,
          }}
        />

        {/* Ambient Floating Glow Orb 2 - Neon Rose */}
        <div
          className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-neon/15 rounded-full blur-[160px] transition-transform duration-500 ease-out"
          style={{
            transform: `translate(${mouseOffset.x * 1.8}px, ${mouseOffset.y * 1.8}px)`,
          }}
        />

        {/* Ambient Center Orb - Deep Indigo */}
        <div
          className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-cerulean/10 rounded-full blur-[150px] transition-transform duration-700 ease-out"
          style={{
            transform: `translate(${mouseOffset.x * 0.9}px, ${mouseOffset.y * 0.9}px)`,
          }}
        />

        {/* Floating Cyber Data Particles */}
        <div
          className="absolute top-20 left-[15%] w-2 h-2 rounded-full bg-cerulean shadow-[0_0_10px_#00A8FF] transition-transform duration-300"
          style={{ transform: `translate(${mouseOffset.x * 1.2}px, ${mouseOffset.y * 1.2}px)` }}
        />
        <div
          className="absolute top-48 right-[20%] w-2.5 h-2.5 rounded-full bg-neon shadow-[0_0_12px_#FF007F] transition-transform duration-300"
          style={{ transform: `translate(${-mouseOffset.x * 1.5}px, ${-mouseOffset.y * 1.5}px)` }}
        />
        <div
          className="absolute top-3/4 left-[10%] w-1.5 h-1.5 rounded-full bg-cerulean shadow-[0_0_8px_#00A8FF] transition-transform duration-200"
          style={{ transform: `translate(${mouseOffset.x * 2}px, ${mouseOffset.y * 2}px)` }}
        />
        <div
          className="absolute top-2/3 right-[12%] w-2 h-2 rounded-full bg-neon shadow-[0_0_10px_#FF007F] transition-transform duration-200"
          style={{ transform: `translate(${-mouseOffset.x * 2}px, ${-mouseOffset.y * 2}px)` }}
        />
      </div>

      {/* Main Content with Foreground z-index */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export const CyberSeoHeroVisual: React.FC = () => {
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
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-jet-900 to-jet-950 border border-jet-800/80 shadow-2xl">
      {/* Dynamic Parallax Backdrops */}
      <div
        className="absolute inset-0 bg-cyber-grid-dense opacity-40 transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px) scale(1.05)`,
        }}
      />

      {/* Cerulean Blue Ambient Light Orb */}
      <div
        className="absolute w-64 h-64 bg-cerulean/20 rounded-full blur-[80px] pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${-mousePos.x * 1.5 - 30}px, ${-mousePos.y * 1.5 - 30}px)`,
        }}
      />

      {/* Neon Rose Ambient Light Orb */}
      <div
        className="absolute w-64 h-64 bg-neon/20 rounded-full blur-[80px] pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${mousePos.x * 1.5 + 30}px, ${mousePos.y * 1.5 + 30}px)`,
        }}
      />

      {/* Futuristic SVG Cyber Crawler Unit */}
      <svg
        className="relative z-10 w-full h-full p-8 transition-transform duration-300 ease-out filter drop-shadow-[0_0_20px_rgba(0,168,255,0.3)]"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `perspective(1000px) rotateY(${mousePos.x * 0.8}deg) rotateX(${-mousePos.y * 0.8}deg)`,
        }}
      >
        <defs>
          <linearGradient id="cyberCerulean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#70D6FF" />
            <stop offset="50%" stopColor="#00A8FF" />
            <stop offset="100%" stopColor="#023E8A" />
          </linearGradient>

          <linearGradient id="cyberRose" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5EAA" />
            <stop offset="50%" stopColor="#FF007F" />
            <stop offset="100%" stopColor="#8F004C" />
          </linearGradient>

          <linearGradient id="jetChrome" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1C2133" />
            <stop offset="100%" stopColor="#090B12" />
          </linearGradient>

          <filter id="neonGlowCerulean" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="neonGlowRose" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Orbital Radar Rings */}
        <circle cx="250" cy="250" r="210" stroke="#00A8FF" strokeWidth="1" strokeDasharray="6 8" strokeOpacity="0.3" />
        <circle cx="250" cy="250" r="180" stroke="#FF007F" strokeWidth="1.5" strokeDasharray="16 12" strokeOpacity="0.4" />
        <circle cx="250" cy="250" r="140" stroke="#00A8FF" strokeWidth="2" strokeDasharray="30 20" strokeOpacity="0.5" />

        {/* Neural Interconnect Links (SEO Graph Nodes) */}
        <g stroke="#00A8FF" strokeWidth="1.5" strokeOpacity="0.4">
          <line x1="250" y1="250" x2="120" y2="120" strokeDasharray="4 4" />
          <line x1="250" y1="250" x2="380" y2="120" strokeDasharray="4 4" />
          <line x1="250" y1="250" x2="100" y2="340" strokeDasharray="4 4" />
          <line x1="250" y1="250" x2="390" y2="350" strokeDasharray="4 4" />
          <line x1="250" y1="250" x2="250" y2="70" strokeDasharray="4 4" />
          <line x1="250" y1="250" x2="250" y2="430" strokeDasharray="4 4" />
        </g>

        {/* Floating Peripheral SEO Nodes */}
        <g transform="translate(120, 120)">
          <circle r="22" fill="#090B12" stroke="#00A8FF" strokeWidth="2" filter="url(#neonGlowCerulean)" />
          <circle r="8" fill="#00A8FF" />
          <text x="28" y="5" fill="#70D6FF" fontSize="12" fontFamily="Rajdhani" fontWeight="bold">SCHEMA.ORG</text>
        </g>

        <g transform="translate(380, 120)">
          <circle r="22" fill="#090B12" stroke="#FF007F" strokeWidth="2" filter="url(#neonGlowRose)" />
          <circle r="8" fill="#FF007F" />
          <text x="-95" y="5" fill="#FF5EAA" fontSize="12" fontFamily="Rajdhani" fontWeight="bold">AEO SYNTHESIS</text>
        </g>

        <g transform="translate(100, 340)">
          <circle r="20" fill="#090B12" stroke="#00A8FF" strokeWidth="2" filter="url(#neonGlowCerulean)" />
          <circle r="7" fill="#00A8FF" />
          <text x="26" y="5" fill="#70D6FF" fontSize="12" fontFamily="Rajdhani" fontWeight="bold">PAGERANK GRAPH</text>
        </g>

        <g transform="translate(390, 350)">
          <circle r="20" fill="#090B12" stroke="#FF007F" strokeWidth="2" filter="url(#neonGlowRose)" />
          <circle r="7" fill="#FF007F" />
          <text x="-85" y="5" fill="#FF5EAA" fontSize="12" fontFamily="Rajdhani" fontWeight="bold">GEO / LLMS.TXT</text>
        </g>

        {/* Robotic Core Spider / Central Processing Head */}
        <polygon
          points="250,165 325,208 325,292 250,335 175,292 175,208"
          fill="url(#jetChrome)"
          stroke="url(#cyberCerulean)"
          strokeWidth="3.5"
          filter="url(#neonGlowCerulean)"
        />

        <polygon
          points="250,185 305,217 305,283 250,315 195,283 195,217"
          fill="#07080D"
          stroke="url(#cyberRose)"
          strokeWidth="2.5"
          filter="url(#neonGlowRose)"
        />

        {/* Robotic Optical Search Eye */}
        <circle cx="250" cy="250" r="32" fill="#06070B" stroke="#00A8FF" strokeWidth="2.5" />
        <circle cx="250" cy="250" r="22" fill="#FF007F" fillOpacity="0.2" stroke="#FF007F" strokeWidth="2" />
        <circle cx="250" cy="250" r="12" fill="#00A8FF" filter="url(#neonGlowCerulean)" />
        <circle cx="246" cy="246" r="4" fill="#FFFFFF" />

        {/* Scan Laser Lines */}
        <line x1="200" y1="250" x2="300" y2="250" stroke="#00E5FF" strokeWidth="2" strokeOpacity="0.8" />
        <line x1="250" y1="200" x2="250" y2="300" stroke="#FF2A85" strokeWidth="2" strokeOpacity="0.8" />

        {/* Diagnostic Status Readouts */}
        <text x="250" y="375" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontFamily="Orbitron" fontWeight="bold" letterSpacing="3">
          CYBER-AUDITOR // v3.0
        </text>
        <text x="250" y="395" textAnchor="middle" fill="#00A8FF" fontSize="10" fontFamily="Rajdhani" fontWeight="bold" letterSpacing="2">
          SCANNING DOM · SSRF PROTECTED · 100% PRIVATE
        </text>
      </svg>
    </div>
  );
};

/**
 * High-tech Parallax Radar Visual displayed during active crawl
 */
export const LiveCrawlParallaxVisual: React.FC<{ currentUrl: string; percentage: number }> = ({
  currentUrl,
  percentage,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 24;
      const y = (e.clientY / innerHeight - 0.5) * 24;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square flex items-center justify-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-jet-900 to-jet-950 border border-cerulean/40 shadow-glow-cerulean mb-8">
      {/* Background radial radar sweep */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,168,255,0.15)_0,transparent_70%)] transition-transform duration-300"
        style={{ transform: `translate(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px)` }}
      />

      {/* Orbiting Laser Radar */}
      <div
        className="relative w-64 h-64 transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(800px) rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg)`,
        }}
      >
        {/* Radar Ring 1 */}
        <div className="absolute inset-0 rounded-full border border-cerulean/30 animate-[spin_8s_linear_infinite]" />
        {/* Radar Ring 2 */}
        <div className="absolute inset-6 rounded-full border border-dashed border-neon/40 animate-[spin_12s_linear_infinite_reverse]" />
        {/* Radar Ring 3 */}
        <div className="absolute inset-12 rounded-full border border-cerulean/50" />

        {/* Sweep Scanner Beam */}
        <div className="absolute top-1/2 left-1/2 w-32 h-[2px] bg-gradient-to-r from-cerulean to-transparent origin-left animate-[spin_3s_linear_infinite] shadow-[0_0_8px_#00A8FF]" />

        {/* Central Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-jet-950 border-2 border-cerulean flex items-center justify-center shadow-glow-cerulean">
          <Radio className="w-8 h-8 text-cerulean animate-pulse" />
        </div>

        {/* Peripheral Telemetry Nodes */}
        <div className="absolute top-4 left-8 px-2 py-0.5 rounded bg-jet-900 border border-cerulean/50 text-[10px] font-mono text-cerulean">
          HTTP // 200
        </div>
        <div className="absolute bottom-6 right-6 px-2 py-0.5 rounded bg-jet-900 border border-neon/50 text-[10px] font-mono text-neon">
          DOM // SCAN
        </div>
        <div className="absolute top-1/2 -right-4 px-2 py-0.5 rounded bg-jet-900 border border-emerald-500/50 text-[10px] font-mono text-emerald-400">
          TLS // OK
        </div>
      </div>

      <div className="absolute bottom-3 inset-x-0 text-center font-orbitron text-[10px] tracking-widest text-slate-400">
        PARALLAX CRAWL TELEMETRY
      </div>
    </div>
  );
};

export const CyberFeatureSectionVisual: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
      {/* Card 1: Technical & PageRank */}
      <div className="relative group p-6 rounded-2xl bg-jet-900/90 border border-jet-800 hover:border-cerulean/60 transition-all duration-300 shadow-cyber-card hover:shadow-glow-cerulean overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cerulean/10 rounded-full blur-2xl group-hover:bg-cerulean/20 transition-all pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-jet-850 border border-cerulean/40 flex items-center justify-center text-cerulean shadow-sm group-hover:scale-110 transition-transform">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-sm text-white group-hover:text-glow-cerulean transition-all">
              PageRank Link Graph
            </h3>
            <span className="text-[10px] font-rajdhani font-semibold text-cerulean tracking-widest uppercase">
              Power Iteration · Click Depth
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Constructs the full internal link adjacency graph, calculating exact authority flow across 20 iterations, identifying orphan nodes and crawl traps.
        </p>
        <div className="mt-4 pt-3 border-t border-jet-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
          <span className="text-cerulean">d = 0.85 DAMPING</span>
          <span className="text-slate-400">BFS DEPTH MATRIX</span>
        </div>
      </div>

      {/* Card 2: AEO & Answer Engines */}
      <div className="relative group p-6 rounded-2xl bg-jet-900/90 border border-jet-800 hover:border-neon/60 transition-all duration-300 shadow-cyber-card hover:shadow-glow-rose overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon/10 rounded-full blur-2xl group-hover:bg-neon/20 transition-all pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-jet-850 border border-neon/40 flex items-center justify-center text-neon shadow-sm group-hover:scale-110 transition-transform">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-sm text-white group-hover:text-glow-rose transition-all">
              AEO & GEO Readiness
            </h3>
            <span className="text-[10px] font-rajdhani font-semibold text-neon tracking-widest uppercase">
              AI Overviews · Perplexity
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Evaluates conversational heading questions, direct definition extraction blocks, table matrices, and <code className="text-neon font-mono">/llms.txt</code> machine-readable files.
        </p>
        <div className="mt-4 pt-3 border-t border-jet-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
          <span className="text-neon">SYNTACTIC Q&A</span>
          <span className="text-slate-400">LLM PARITY CHECK</span>
        </div>
      </div>

      {/* Card 3: 64-bit SimHash Deduplication */}
      <div className="relative group p-6 rounded-2xl bg-jet-900/90 border border-jet-800 hover:border-cerulean/60 transition-all duration-300 shadow-cyber-card hover:shadow-glow-cerulean overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cerulean/10 rounded-full blur-2xl group-hover:bg-cerulean/20 transition-all pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-jet-850 border border-cerulean/40 flex items-center justify-center text-cerulean shadow-sm group-hover:scale-110 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-sm text-white group-hover:text-glow-cerulean transition-all">
              64-bit SimHash Shingling
            </h3>
            <span className="text-[10px] font-rajdhani font-semibold text-cerulean tracking-widest uppercase">
              Charikar Algorithm · Near-Duplicates
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Clusters duplicate documents using 3-word shingles and bitwise Hamming distance computation, discovering cannibalized pages and boilerplate overlap.
        </p>
        <div className="mt-4 pt-3 border-t border-jet-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
          <span className="text-cerulean">HAMMING DIST &le; 7</span>
          <span className="text-slate-400">&ge; 85% OVERLAP</span>
        </div>
      </div>
    </div>
  );
};
