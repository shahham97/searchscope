'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Bot, FileText, CheckCircle2 } from 'lucide-react';
import { GmailContactLink } from './GmailContactLink';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded bg-white text-slate-900 font-bold flex items-center justify-center text-sm">
                S
              </div>
              <span className="font-semibold text-white tracking-tight text-base">SearchScope</span>
              <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                SEO · AEO · GEO
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              SearchScope is an independent technical search intelligence auditor. It inspects technical crawlability, structured data, information architecture, and answer-engine readiness without requiring user accounts or third-party tracking.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Zero-persistence runtime. No report data or domains are written to disk or database.</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Platform & Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/"
                  className="text-slate-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                >
                  Website Auditor
                </Link>
              </li>
              <li>
                <Link
                  href="/bot"
                  className="text-slate-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                >
                  <Bot className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  Bot Transparency & Politeness
                </Link>
              </li>
              <li>
                <a
                  href="#privacy-disclosure"
                  className="text-slate-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Privacy & Data Hygiene
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Contact & Direct Inquiries
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Questions regarding audit findings or crawling behavior? Reach our engineering team directly:
            </p>
            <GmailContactLink variant="footer" className="text-slate-300" />
          </div>
        </div>

        {/* Bottom Bar: Privacy & Legal Statement */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <div className="text-center md:text-left">
            <span>&copy; {new Date().getFullYear()} SearchScope. Built for transparent search intelligence.</span>
            <span className="block sm:inline sm:ml-2 text-slate-400">
              Transient execution on Vercel serverless. Standard HTTP infrastructure logs (IP, timestamp, path) are retained ephemerally by host networks.
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center text-slate-400">
              <ShieldCheck className="h-3 w-3 mr-1 text-emerald-500" />
              100% Private Audit Engine
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
