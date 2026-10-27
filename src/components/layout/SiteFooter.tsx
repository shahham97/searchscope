'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Bot, Cpu, CheckCircle2, Terminal } from 'lucide-react';
import { GmailContactLink } from './GmailContactLink';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="bg-jet-950 text-slate-300 border-t border-jet-800/80 pt-10 sm:pt-16 pb-8 sm:pb-12 relative overflow-hidden">
      {/* Ambient background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cerulean/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-neon/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 pb-8 sm:pb-12 border-b border-jet-800">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cerulean to-neon p-[1px] shadow-glow-cerulean shrink-0">
                <div className="h-full w-full bg-jet-900 rounded-lg flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-cerulean" />
                </div>
              </div>
              <span className="font-orbitron font-extrabold text-white tracking-widest text-base sm:text-lg">
                SEARCH<span className="text-cerulean">SCOPE</span>
              </span>
              <span className="hidden sm:inline-block font-rajdhani text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-jet-900 text-neon border border-neon/30">
                CYBER SEARCH INTELLIGENCE
              </span>
            </div>

            <p className="text-xs font-sans text-slate-400 max-w-md leading-relaxed">
              Autonomous, privacy-first technical search intelligence platform. Inspects deep crawlability, internal link authority, Schema.org entities, and answer-engine generative readiness with deterministic offline algorithms.
            </p>

            <div className="flex items-center space-x-2.5 text-xs font-rajdhani font-semibold text-emerald-400 pt-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Zero-persistence execution. No audit findings or domains are written to any database.</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-widest text-glow-cerulean">
              Engine Modules
            </h4>
            <ul className="space-y-2.5 text-xs font-rajdhani font-medium tracking-wider">
              <li>
                <Link
                  href="/"
                  className="text-slate-400 hover:text-white hover:text-glow-cerulean transition-colors min-h-[44px] inline-flex items-center"
                >
                  SEO / AEO / GEO Auditor
                </Link>
              </li>
              <li>
                <Link
                  href="/bot"
                  className="text-slate-400 hover:text-white hover:text-glow-cerulean transition-colors min-h-[44px] inline-flex items-center"
                >
                  <Bot className="h-3.5 w-3.5 mr-2 text-cerulean" />
                  Crawler Bot Transparency & RFC Rules
                </Link>
              </li>
              <li>
                <Link
                  href="/bot#rules"
                  className="text-slate-400 hover:text-white hover:text-glow-cerulean transition-colors min-h-[44px] inline-flex items-center"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                  SSRF Protection & Zero-Storage Threat Model
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-widest text-glow-rose">
              Direct Contact
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Have technical questions regarding our crawler behavior or algorithm rules? Reach our core developer directly:
            </p>
            <GmailContactLink email="developerforhirre@gmail.com" variant="footer" className="text-slate-200" />
          </div>
        </div>

        {/* Bottom Bar: Privacy & Legal Statement */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <div className="text-center md:text-left font-rajdhani font-medium tracking-wide">
            <span>&copy; {new Date().getFullYear()} SearchScope. Built for transparent, unmanipulated search intelligence.</span>
            <span className="block sm:inline sm:ml-2 text-slate-400">
              Ephemeral execution on edge compute nodes. Direct contact: <a href="mailto:developerforhirre@gmail.com" className="text-cerulean underline">developerforhirre@gmail.com</a>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center text-xs font-rajdhani font-bold text-emerald-400 bg-jet-900 px-3 py-1 rounded border border-emerald-500/20 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              100% Client Ephemeral
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
