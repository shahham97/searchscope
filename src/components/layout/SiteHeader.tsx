'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Menu, X, Bot, Cpu } from 'lucide-react';
import { GmailContactLink } from './GmailContactLink';

export const SiteHeader: React.FC = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-jet-950/90 backdrop-blur-xl border-b border-jet-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.8)] pt-3 pb-2 sm:pt-3.5 sm:pb-2.5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3.5 group min-h-[44px]">
            {/* Cyber Robotic Emblem */}
            <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-cerulean via-jet-900 to-neon p-[1px] shadow-glow-cerulean group-hover:shadow-glow-rose transition-all duration-300">
              <div className="h-full w-full bg-jet-900 rounded-lg flex items-center justify-center">
                <Cpu className="h-5 w-5 text-cerulean group-hover:text-neon transition-colors duration-300" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center space-x-2.5">
                <span className="font-orbitron font-extrabold text-white tracking-widest text-lg group-hover:text-glow-cerulean transition-all">
                  SEARCH<span className="text-cerulean">SCOPE</span>
                </span>
                <span className="font-rajdhani text-[11px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-jet-850 text-neon border border-neon/40 shadow-[0_0_12px_rgba(255,0,127,0.25)]">
                  SEO · AEO · GEO
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-lg text-xs font-rajdhani font-bold uppercase tracking-widest transition-all min-h-[44px] flex items-center ${
                pathname === '/'
                  ? 'text-white bg-jet-850 border border-cerulean/50 shadow-[0_0_15px_rgba(0,168,255,0.25)]'
                  : 'text-slate-400 hover:text-white hover:bg-jet-900 hover:border hover:border-jet-700'
              }`}
            >
              Intelligence Auditor
            </Link>
            <Link
              href="/bot"
              className={`px-3.5 py-2 rounded-lg text-xs font-rajdhani font-bold uppercase tracking-widest transition-all min-h-[44px] flex items-center ${
                pathname === '/bot'
                  ? 'text-white bg-jet-850 border border-cerulean/50 shadow-[0_0_15px_rgba(0,168,255,0.25)]'
                  : 'text-slate-400 hover:text-white hover:bg-jet-900 hover:border hover:border-jet-700'
              }`}
            >
              <Bot className="h-4 w-4 mr-1.5 text-cerulean" />
              Bot Transparency
            </Link>
          </nav>
        </div>

        {/* Right side Actions & Direct Contact */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-jet-900 border border-jet-700 text-xs font-rajdhani text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-bold uppercase tracking-wider text-[11px]">100% Private</span>
            <span className="text-slate-500 font-mono text-[10px]">· Zero DB</span>
          </div>

          <GmailContactLink email="developerforhirre@gmail.com" variant="pill" />
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden items-center space-x-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-jet-900 min-h-[44px] min-w-[44px] flex items-center justify-center border border-jet-800"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6 text-neon" /> : <Menu className="h-6 w-6 text-cerulean" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-jet-850 bg-jet-950/98 px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-1.5 font-rajdhani font-bold uppercase tracking-wider text-sm">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg flex items-center ${
                pathname === '/' ? 'text-white bg-jet-900 text-glow-cerulean' : 'text-slate-400 hover:text-white'
              }`}
            >
              Intelligence Auditor
            </Link>
            <Link
              href="/bot"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg flex items-center ${
                pathname === '/bot' ? 'text-white bg-jet-900 text-glow-cerulean' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="h-4 w-4 mr-2 text-cerulean" />
              Bot Transparency
            </Link>
          </div>

          <div className="pt-2 border-t border-jet-850 flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-xs font-rajdhani text-slate-400 px-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Zero-Storage Security Architecture</span>
            </div>
            <GmailContactLink email="developerforhirre@gmail.com" variant="pill" className="w-full justify-center" />
          </div>
        </div>
      )}
    </header>
  );
};
