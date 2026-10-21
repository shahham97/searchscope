import React from 'react';
import { Sparkles, Bot, CheckCircle2, HelpCircle, FileText, Check, AlertTriangle } from 'lucide-react';
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
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Answer Engine Optimization (AEO)</h3>
                <p className="text-xs text-slate-500">Readiness for conversational Q&A and featured snippets</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600">{aeoScore}/100</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">FAQ & Q&A Content Coverage</span>
              <span className="font-semibold text-slate-900">
                {pagesWithFAQ} of {report.pages.length} pages
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Comparison Tables & Structured Lists</span>
              <span className="font-semibold text-slate-900">
                {pagesWithTablesOrLists} of {report.pages.length} pages
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Direct Definitional Statements</span>
              <span className="font-semibold text-slate-900">
                {pagesWithDefinitions} of {report.pages.length} pages
              </span>
            </div>
          </div>
        </Card>

        {/* GEO Card */}
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Generative Engine Optimization (GEO)</h3>
                <p className="text-xs text-slate-500">Machine-interpretability for LLM synthesis and citations</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600">{geoScore}/100</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">/llms.txt AI Agent File</span>
              <span>
                {report.crawlStats.llmsTxtPresent ? (
                  <Badge variant="success">Detected at Root</Badge>
                ) : (
                  <Badge variant="neutral">Not Detected (Optional)</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Author & Credential Transparency</span>
              <span className="font-semibold text-slate-900">
                {pagesWithAuthor} of {report.pages.length} pages
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Semantic Schema Entity Clarity</span>
              <span className="font-semibold text-slate-900">
                {report.findings.some((f) => f.id === 'SCHEMA-ORG-MISSING') ? 'Missing Entity Schema' : 'Verified'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Methodology and Honest Standards Callout */}
      <Card className="p-5 bg-slate-50 border-slate-200 text-xs text-slate-600 leading-relaxed">
        <h4 className="font-bold text-slate-900 mb-1 flex items-center">
          <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
          SearchScope Ethical Standards on AEO & GEO
        </h4>
        <p>
          SearchScope assesses observable structural and semantic signals that facilitate machine reading, such as
          clear question-answer hierarchies, Schema.org entities, HTML tables, and concise definitions.
          We explicitly do not manufacture fake &quot;AI Visibility Percentages&quot; or claim guaranteed inclusion in ChatGPT,
          Google AI Overviews, Perplexity, or Copilot. Inclusion in generative answers depends on proprietary model
          training cuts, real-time retrieval parameters, and query relevance.
        </p>
      </Card>
    </div>
  );
};
