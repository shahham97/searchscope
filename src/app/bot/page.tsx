import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ShieldCheck, FileCode, Server, Mail } from 'lucide-react';

export const metadata = {
  title: 'SearchScopeBot / Auditor Documentation',
  description:
    'Information regarding the SearchScope-Auditor web crawler, its purpose, politeness standards, IP ranges, and robots.txt directives.',
};

export default function BotPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SearchScope Audit
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SearchScope-Auditor/1.0
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-xs font-mono">
            <Bot className="w-3.5 h-3.5" />
            Crawler Verification & Technical Documentation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            SearchScope-Auditor Documentation
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg leading-relaxed">
            If you have observed requests with the User-Agent{' '}
            <code className="text-xs font-mono text-indigo-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              SearchScope-Auditor/1.0 (+https://searchscope.app/bot)
            </code>
            , this page outlines what the crawler is, its strict safety guidelines, and how to control or block it.
          </p>
        </div>

        {/* Overview & Purpose */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <ShieldCheck className="w-5 h-5" />
              On-Demand SEO / AEO Auditing
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              SearchScope does <strong>not</strong> perform bulk web scraping or persistent site monitoring. A crawl is only executed when an authorized user or webmaster explicitly initiates an on-demand audit of their domain to evaluate search visibility, schema markup, and machine readability.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Server className="w-5 h-5" />
              Politeness & Rate Throttling
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Our crawler strictly limits concurrent requests to 1 concurrent connection with a mandatory 150ms–250ms politeness delay between pages. It crawls only publicly reachable HTML pages (depth capped at 25–250 URLs) and never attempts to access administrative endpoints or submit forms.
            </p>
          </div>
        </div>

        {/* Controlling / Blocking in robots.txt */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h2>How to Control or Block SearchScope in robots.txt</h2>
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">
            SearchScope-Auditor strictly honors standard <code className="text-neutral-200">robots.txt</code> directives. To block the crawler entirely from your website, add the following snippet to your <code className="text-neutral-200">robots.txt</code> file:
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 font-mono text-sm text-neutral-200 space-y-2">
            <div className="text-neutral-500"># Disallow SearchScope Auditor entirely</div>
            <div className="text-amber-400">User-agent: SearchScope-Auditor</div>
            <div className="text-rose-400">Disallow: /</div>
            <div className="text-neutral-500 mt-4"># Alternatively, disallow via wildcard</div>
            <div className="text-amber-400">User-agent: *</div>
            <div className="text-rose-400">Disallow: /private-path/</div>
          </div>

          <p className="text-xs text-neutral-400">
            If you wish to allow SearchScope to audit your public catalog while blocking private subpaths, specify paths with <code className="text-neutral-300">Disallow: /checkout</code> or <code className="text-neutral-300">Disallow: /admin</code>.
          </p>
        </section>

        {/* IP Egress & Hosting Architecture */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">IP Ranges & Egress Network</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            SearchScope operates as a serverless application deployed on <strong>Vercel</strong> edge/node infrastructure. Outbound crawl requests originate from Vercel compute edge IP ranges. Outgoing requests always supply the descriptive <code className="text-neutral-300">User-Agent</code> header and include a referral link back to this documentation URL.
          </p>
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-mono">
            Origin Host: vercel-dns.com / vercel-infra egress nodes
          </div>
        </section>

        {/* Contact & Abuse Reporting */}
        <section className="p-6 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <Mail className="w-5 h-5 text-indigo-400" />
            Contact & Webmaster Support
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            If you suspect abnormal traffic or have technical questions regarding crawler operations on your domain, please contact the engineering team. Include your domain name and relevant server access logs.
          </p>
          <div className="text-xs font-mono text-indigo-400">
            Email: <span className="underline">support@searchscope.app</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-800 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} SearchScope. Privacy-first deterministic web search intelligence.
      </footer>
    </div>
  );
}
