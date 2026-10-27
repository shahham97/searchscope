'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Menu, X, Bot, Search, ExternalLink } from 'lucide-react';
import { GmailContactLink } from './GmailContactLink';

export const SiteHeader: React.FC = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group min-h-[44px]">
            <div className="h-8 w-8 rounded bg-slate-900 flex items-center justify-center text-white font-semibold text-sm shadow-sm group-hover:bg-slate-800 transition-colors">
              S
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900 tracking-tight text-base">SearchScope</span>
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  SEO · AEO · GEO
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px] flex items-center ${
                pathname === '/'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Auditor
            </Link>
            <Link
              href="/bot"
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px] flex items-center ${
                pathname === '/bot'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bot className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Bot Transparency
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-medium">100% Private · Zero Saved Data</span>
          </div>

          <GmailContactLink variant="footer" />
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-md text-sm font-medium min-h-[44px] flex items-center ${
                pathname === '/' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Auditor
            </Link>
            <Link
              href="/bot"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-md text-sm font-medium min-h-[44px] flex items-center ${
                pathname === '/bot' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bot className="h-4 w-4 mr-2 text-slate-500" />
              Bot Transparency
            </Link>
          </nav>

          <div className="pt-2 border-t border-slate-200 flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded border border-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>100% Private · No Database · No Saved Data</span>
            </div>
            <GmailContactLink variant="pill" />
          </div>
        </div>
      )}
    </header>
  );
};
