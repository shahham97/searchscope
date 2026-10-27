import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ShieldCheck, FileCode, Server } from 'lucide-react';
import { GmailContactLink } from '@/components/layout/GmailContactLink';

export const metadata = {
  title: 'SearchScope-Auditor Documentation',
  description:
    'Technical specifications for the SearchScope-Auditor crawler, politeness throttling, IP ranges, and robots.txt directives.',
  openGraph: {
    title: 'SearchScope-Auditor Documentation',
    description:
      'Technical specifications for the SearchScope-Auditor crawler, politeness throttling, IP ranges, and robots.txt directives.',
    url: 'https://searchscope.app/bot',
    images: [{ url: 'https://searchscope.app/og.png' }],
  },
};

export default function BotPage() {
  return (
    <div className="bg-slate-900 text-slate-100 min-h-[calc(100vh-4rem)]">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SearchScope Auditor
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SearchScope-Auditor/1.0
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
            <Bot className="w-3.5 h-3.5 text-slate-400" />
            Crawler Verification & Technical Policy
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            SearchScope-Auditor Documentation
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            If you have observed requests with the User-Agent{' '}
            <code className="text-xs font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              SearchScope-Auditor/1.0 (+https://searchscope.app/bot)
            </code>
            , this documentation details crawler operations, strict safety guidelines, and procedures to configure or block access.
          </p>
        </div>

        {/* Overview & Purpose */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              On-Demand SEO / AEO Auditing
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              SearchScope does <strong>not</strong> perform bulk web scraping or persistent site surveillance. A crawl is only executed when an authorized user or webmaster explicitly launches an on-demand audit to evaluate search visibility, structured data, and machine readability.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Server className="w-4 h-4" />
              Politeness & Rate Throttling
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our crawler restricts concurrency to 1 active connection with a mandatory 150ms–250ms delay between pages. It crawls only publicly reachable HTML pages (depth capped at 25–250 URLs) and never attempts to access administrative endpoints or submit forms.
            </p>
          </div>
        </div>

        {/* Controlling / Blocking in robots.txt */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h2>How to Control or Block SearchScope in robots.txt</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            SearchScope-Auditor honors standard <code className="text-slate-200 font-mono">robots.txt</code> directives. To block the crawler entirely from your website, add the following snippet to your <code className="text-slate-200 font-mono">robots.txt</code> file:
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 space-y-2">
            <div className="text-slate-500"># Disallow SearchScope Auditor entirely</div>
            <div className="text-amber-400">User-agent: SearchScope-Auditor</div>
            <div className="text-rose-400">Disallow: /</div>
            <div className="text-slate-500 pt-2"># Alternatively, disallow via wildcard</div>
            <div className="text-amber-400">User-agent: *</div>
            <div className="text-rose-400">Disallow: /private-path/</div>
          </div>

          <p className="text-xs text-slate-400">
            If you wish to allow SearchScope to audit your public catalog while blocking private subpaths, specify paths with <code className="text-slate-300 font-mono">Disallow: /checkout</code> or <code className="text-slate-300 font-mono">Disallow: /admin</code>.
          </p>
        </section>

        {/* IP Egress & Hosting Architecture */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">IP Ranges & Egress Network</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            SearchScope operates as a serverless application deployed on <strong>Vercel</strong> edge/node infrastructure. Outbound crawl requests originate from Vercel compute edge IP ranges. Outgoing requests always supply the descriptive <code className="text-slate-300 font-mono">User-Agent</code> header and include a referral link back to this documentation URL.
          </p>
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
            Origin Host: vercel-dns.com / vercel-infra egress nodes
          </div>
        </section>

        {/* Contact & Abuse Reporting */}
        <section className="p-6 rounded-lg bg-slate-800/60 border border-slate-700 space-y-4">
          <h3 className="text-sm font-semibold text-white">Contact & Webmaster Support</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            If you have technical questions regarding crawler operations on your domain, please reach our engineering team directly:
          </p>
          <GmailContactLink variant="pill" subject="SearchScope Crawler Webmaster Inquiry" />
        </section>
      </div>
    </div>
  );
}
