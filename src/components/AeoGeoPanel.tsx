import React from 'react';
import { Layers, Bot, CheckCircle2, HelpCircle, FileText, Check, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { AuditReport } from '../types/audit';

interface AeoGeoPanelProps {
  report: AuditReport;
}

export const AeoGeoPanel: React.FC<AeoGeoPanelProps> = ({ report }) => {
  const pagesWithFAQ = report.pages.filter((p) => p.hasFAQMarkupOrContent).length;
  const pagesWithTablesOrLists = report.pages.filter((p) => p.hasTablesOrLists).length;
  const pagesWithDefinitions = report.pages.filter((p) => p.hasDirectDefinitions).length;
  const pagesWithAuthor = report.pages.filter((p) => p.hasAuthorAttribution).length;

  const aeoScore = report.categoryScores.find((c) => c.category === 'aeo')?.score || 0;
  const geoScore = report.categoryScores.find((c) => c.category === 'geo')?.score || 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AEO Card */}
        <Card className="p-6 bg-jet-900 border-jet-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cerulean/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cerulean/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-cerulean/10 border border-cerulean/30 flex items-center justify-center text-cerulean shadow-glow-cerulean">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-orbitron">Answer Engine Optimization (AEO)</h3>
                <p className="text-xs text-slate-400">Readiness for conversational Q&A and featured snippets</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-cerulean font-orbitron text-glow-cerulean">{aeoScore}/100</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-jet-800">
              <span className="text-slate-300">FAQ & Q&A Content Coverage</span>
              <span className="font-semibold text-white font-mono">
                {pagesWithFAQ} of {report.pages.length} pages
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-jet-800">
              <span className="text-slate-300">Comparison Tables & Structured Lists</span>
              <span className="font-semibold text-white font-mono">
                {pagesWithTablesOrLists} of {report.pages.length} pages
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-jet-800">
              <span className="text-slate-300">Direct Definitional Statements</span>
              <span className="font-semibold text-white font-mono">
                {pagesWithDefinitions} of {report.pages.length} pages
              </span>
            </div>
          </div>
        </Card>

        {/* GEO Card */}
        <Card className="p-6 bg-jet-900 border-jet-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon/5 rounded-full blur-2xl pointer-events-none group-hover:bg-neon/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-rose-950/60 border border-neon/40 flex items-center justify-center text-neon shadow-glow-rose">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-orbitron">Generative Engine Optimization (GEO)</h3>
                <p className="text-xs text-slate-400">Machine-interpretability for LLM synthesis and citations</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-neon font-orbitron text-glow-rose">{geoScore}/100</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-jet-800">
              <span className="text-slate-300">/llms.txt AI Agent File</span>
              <span>
                {report.crawlStats.llmsTxtPresent ? (
                  <Badge variant="success">Detected at Root</Badge>
                ) : (
                  <Badge variant="neutral">Not Detected (Optional)</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-jet-800">
              <span className="text-slate-300">Author & Credential Transparency</span>
              <span className="font-semibold text-white font-mono">
                {pagesWithAuthor} of {report.pages.length} pages
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-jet-800">
              <span className="text-slate-300">Semantic Schema Entity Clarity</span>
              <span className="font-semibold text-white">
                {report.findings.some((f) => f.id === 'SCHEMA-ORG-MISSING') ? (
                  <span className="text-neon">Missing Entity Schema</span>
                ) : (
                  <span className="text-emerald-400">Verified</span>
                )}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Bots Audit from robots.txt */}
      {report.crawlStats.aiBotsAudit && report.crawlStats.aiBotsAudit.length > 0 && (
        <Card className="p-6 bg-jet-900 border-jet-800">
          <div className="flex items-center space-x-2.5 mb-4">
            <Bot className="h-5 w-5 text-cerulean" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-orbitron">
              AI & Answer Engine Crawler Access Matrix (robots.txt Audit)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.crawlStats.aiBotsAudit.map((b) => (
              <div
                key={b.bot}
                className="p-3 rounded-xl border border-jet-800 bg-jet-950 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-white">{b.bot}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{b.ruleSnippet}</div>
                </div>
                {b.allowed ? (
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                    <Check className="h-3 w-3 mr-1 text-emerald-400" /> Allowed
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-semibold text-neon bg-rose-950/60 px-2 py-0.5 rounded border border-neon/40">
                    <XCircle className="h-3 w-3 mr-1 text-neon" /> Blocked
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Methodology Callout */}
      <Card className="p-5 bg-jet-950 border-jet-800 text-xs text-slate-300 leading-relaxed">
        <h4 className="font-bold text-white mb-1.5 flex items-center font-rajdhani text-sm">
          <ShieldCheck className="h-4 w-4 mr-2 text-cerulean" />
          SearchScope Ethical Standards on AEO & GEO
        </h4>
        <p className="text-slate-400">
          SearchScope assesses observable structural and semantic signals that facilitate machine reading, such as
          clear question-answer hierarchies, Schema.org entities, HTML tables, and concise definitions.
          We explicitly do not manufacture fake &quot;AI Visibility Percentages&quot; or claim guaranteed inclusion in ChatGPT,
          Google AI Overviews, Perplexity, or Copilot.
        </p>
      </Card>
    </div>
  );
};
