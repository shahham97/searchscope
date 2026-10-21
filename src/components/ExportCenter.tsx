import React, { useState } from 'react';
import {
  Archive,
  FileDown,
  FileText,
  FileCode,
  Table,
  Check,
  Sparkles,
  Bot,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AuditReport } from '../types/audit';
import {
  generateFullZip,
  generateImprovementsMd,
  generateRoadmapMd,
  generateStandaloneHtml,
  generateCsvFiles,
  generateDeployableFiles,
} from '../lib/export/export-generators';
import { generateAuditPdf } from '../lib/export/pdf-generator';

interface ExportCenterProps {
  report: AuditReport;
}

export const ExportCenter: React.FC<ExportCenterProps> = ({ report }) => {
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const cleanDomain = report.targetDomain.replace(/[^a-zA-Z0-9.-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];

  const triggerDownload = (blob: Blob | string, filename: string, isText = false) => {
    const dataBlob = isText ? new Blob([blob as string], { type: 'text/plain;charset=utf-8' }) : (blob as Blob);
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zipBlob = await generateFullZip(report);
      triggerDownload(zipBlob, `searchscope-${cleanDomain}-full-audit-${dateStamp}.zip`);
    } catch (err) {
      console.error('ZIP generation failed:', err);
      alert('Could not compile ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      generateAuditPdf(report);
      setDownloadSuccess('PDF Report');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  const csvFiles = generateCsvFiles(report);
  const deployableFiles = generateDeployableFiles(report);

  return (
    <div className="space-y-6">
      {/* Hero ZIP banner */}
      <Card className="p-6 sm:p-8 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="success">All-In-One Deliverable</Badge>
              <span className="text-xs text-indigo-200">Zero Server Storage · 100% Client Assembled</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              SearchScope Complete Export Bundle (ZIP)
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
              Includes the full PDF report, machine-readable JSON, standalone HTML, 7 CSV tables, AI-agent fix plan (IMPROVEMENTS.md), and ready-to-deploy robots.txt / sitemap.xml.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleDownloadZip}
            isLoading={isZipping}
            className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-6 py-3 shrink-0 shadow-lg"
          >
            <Archive className="h-5 w-5 mr-2 text-indigo-600" />
            Download Complete ZIP
          </Button>
        </div>
      </Card>

      {/* Success alert */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Downloaded <strong>{downloadSuccess}</strong> successfully.</span>
        </div>
      )}

      {/* Grid of Individual Deliverables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Deliverable 1: PDF */}
        <Card className="p-5 bg-white border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-rose-600">
              <FileDown className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-sm">Executive PDF Report</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Polished vector PDF with cover, executive scorecards, prioritized roadmap, and full evidence tables.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="w-full text-xs">
            Download PDF
          </Button>
        </Card>

        {/* Deliverable 2: IMPROVEMENTS.md */}
        <Card className="p-5 bg-white border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-indigo-600">
              <Bot className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-sm">IMPROVEMENTS.md</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              AI-agent task plan with exact code patches, formatted for copy-pasting directly into Cursor or Claude Code.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              triggerDownload(
                generateImprovementsMd(report),
                `IMPROVEMENTS-${cleanDomain}-${dateStamp}.md`,
                true
              )
            }
            className="w-full text-xs"
          >
            Download IMPROVEMENTS.md
          </Button>
        </Card>

        {/* Deliverable 3: audit-full.json */}
        <Card className="p-5 bg-white border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-emerald-600">
              <FileCode className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-sm">Machine JSON (audit-full.json)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Full machine-readable audit dataset for CI/CD pipelines, automated testing, or custom reporting.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              triggerDownload(
                JSON.stringify(report, null, 2),
                `audit-full-${cleanDomain}-${dateStamp}.json`,
                true
              )
            }
            className="w-full text-xs"
          >
            Download audit-full.json
          </Button>
        </Card>

        {/* Deliverable 4: Standalone report.html */}
        <Card className="p-5 bg-white border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-blue-600">
              <FileText className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-sm">Standalone report.html</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Self-contained offline HTML report with embedded styles, easily shared over email or Slack.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              triggerDownload(
                generateStandaloneHtml(report),
                `report-${cleanDomain}-${dateStamp}.html`,
                true
              )
            }
            className="w-full text-xs"
          >
            Download report.html
          </Button>
        </Card>

        {/* Deliverable 5: ROADMAP.md */}
        <Card className="p-5 bg-white border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-purple-600">
              <Code2 className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-sm">ROADMAP.md</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Prioritized 5-phase engineering roadmap ordered by business impact and implementation effort.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              triggerDownload(
                generateRoadmapMd(report),
                `ROADMAP-${cleanDomain}-${dateStamp}.md`,
                true
              )
            }
            className="w-full text-xs"
          >
            Download ROADMAP.md
          </Button>
        </Card>

        {/* Deliverable 6: CSV Data Tables */}
        <Card className="p-5 bg-white border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-amber-600">
              <Table className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-sm">CSV Data Tables</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Instant access to tabular exports: findings, URLs, candidate keywords, internal links, and schemas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => triggerDownload(csvFiles['findings.csv'], `findings-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1 px-2 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              findings.csv
            </button>
            <button
              onClick={() => triggerDownload(csvFiles['urls.csv'], `urls-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1 px-2 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              urls.csv
            </button>
            <button
              onClick={() => triggerDownload(csvFiles['keywords.csv'], `keywords-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1 px-2 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              keywords.csv
            </button>
            <button
              onClick={() => triggerDownload(csvFiles['structured-data.csv'], `schemas-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1 px-2 rounded bg-slate-50 hover:bg-slate-100 border text-slate-700 truncate"
            >
              schemas.csv
            </button>
          </div>
        </Card>
      </div>

      {/* Auto-generated ready-to-deploy files */}
      <Card className="p-6 bg-white border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
          <Sparkles className="h-4 w-4 mr-1.5 text-indigo-600" />
          Auto-Generated Ready-to-Deploy Files
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Pre-configured configuration files ready to drop directly into your website public/root directory.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['robots.txt'], 'robots.txt', true)}
            className="text-xs justify-start"
          >
            <FileText className="h-3.5 w-3.5 mr-2 text-indigo-600" />
            robots.txt
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['sitemap.xml'], 'sitemap.xml', true)}
            className="text-xs justify-start"
          >
            <FileCode className="h-3.5 w-3.5 mr-2 text-emerald-600" />
            sitemap.xml
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['llms.txt'], 'llms.txt', true)}
            className="text-xs justify-start"
          >
            <Bot className="h-3.5 w-3.5 mr-2 text-purple-600" />
            llms.txt
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['jsonld-snippets.json'], 'jsonld-snippets.json', true)}
            className="text-xs justify-start"
          >
            <Code2 className="h-3.5 w-3.5 mr-2 text-amber-600" />
            JSON-LD Snippets
          </Button>
        </div>
      </Card>
    </div>
  );
};
