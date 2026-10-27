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
      setDownloadSuccess('Executive PDF Report');
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
      <Card className="p-4 sm:p-8 bg-jet-950 border border-cerulean/40 text-white rounded-2xl shadow-glow-cerulean relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cerulean/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cerulean/10 transition-colors" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="low">All-In-One Deliverable</Badge>
              <span className="text-[11px] sm:text-xs text-cerulean/80 font-mono">Zero Server Storage · 100% Client Assembled</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-orbitron">
              SearchScope Complete Export Bundle (ZIP)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Includes the executive high-contrast PDF report, machine-readable JSON, standalone HTML, 7 CSV tables, AI-agent fix plan (IMPROVEMENTS.md), and ready-to-deploy robots.txt / sitemap.xml.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleDownloadZip}
            isLoading={isZipping}
            className="w-full md:w-auto bg-cerulean text-jet-950 hover:bg-cerulean-400 font-orbitron font-bold px-6 py-3 shrink-0 shadow-glow-cerulean transition-all transform hover:scale-[1.02]"
          >
            <Archive className="h-5 w-5 mr-2 text-jet-950" />
            Download Complete ZIP
          </Button>
        </div>
      </Card>

      {/* Success alert */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-mono flex items-center space-x-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Downloaded <strong>{downloadSuccess}</strong> successfully.</span>
        </div>
      )}

      {/* Grid of Individual Deliverables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Deliverable 1: PDF */}
        <Card className="p-5 bg-jet-900 border-jet-800 hover:border-neon/50 hover:shadow-glow-rose transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-neon">
              <FileDown className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm font-orbitron">Executive PDF Report</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Ultra-sharp vector PDF with executive scorecard, dimension breakdowns, prioritized roadmap, and complete DOM evidence.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="w-full text-xs border-neon/40 text-neon hover:bg-rose-950/60 hover:text-white font-rajdhani tracking-wider"
          >
            Download PDF
          </Button>
        </Card>

        {/* Deliverable 2: IMPROVEMENTS.md */}
        <Card className="p-5 bg-jet-900 border-jet-800 hover:border-cerulean/50 hover:shadow-glow-cerulean transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-cerulean">
              <Bot className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm font-orbitron">IMPROVEMENTS.md</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
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
            className="w-full text-xs border-cerulean/40 text-cerulean hover:bg-cerulean/20 hover:text-white font-rajdhani tracking-wider"
          >
            Download IMPROVEMENTS.md
          </Button>
        </Card>

        {/* Deliverable 3: audit-full.json */}
        <Card className="p-5 bg-jet-900 border-jet-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-emerald-400">
              <FileCode className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm font-orbitron">Machine JSON (audit-full.json)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Full machine-readable audit dataset for CI/CD pipelines, automated testing, or custom enterprise reporting.
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
            className="w-full text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60 font-rajdhani tracking-wider"
          >
            Download audit-full.json
          </Button>
        </Card>

        {/* Deliverable 4: Standalone report.html */}
        <Card className="p-5 bg-jet-900 border-jet-800 hover:border-cerulean/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-cerulean-300">
              <FileText className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm font-orbitron">Standalone report.html</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
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
            className="w-full text-xs border-cerulean/30 text-cerulean-300 hover:bg-cerulean/20 font-rajdhani tracking-wider"
          >
            Download report.html
          </Button>
        </Card>

        {/* Deliverable 5: ROADMAP.md */}
        <Card className="p-5 bg-jet-900 border-jet-800 hover:border-neon/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-neon">
              <Code2 className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm font-orbitron">ROADMAP.md</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
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
            className="w-full text-xs border-neon/40 text-neon hover:bg-rose-950/60 font-rajdhani tracking-wider"
          >
            Download ROADMAP.md
          </Button>
        </Card>

        {/* Deliverable 6: CSV Data Tables */}
        <Card className="p-5 bg-jet-900 border-jet-800 hover:border-amber-500/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center space-x-2.5 mb-2 text-amber-400">
              <Table className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm font-orbitron">CSV Data Tables</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Instant access to tabular exports: findings, URLs, candidate keywords, internal links, and schemas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono">
            <button
              onClick={() => triggerDownload(csvFiles['findings.csv'], `findings-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1.5 px-2 rounded bg-jet-950 hover:bg-jet-800 border border-jet-800 text-slate-300 hover:text-white truncate transition-colors"
            >
              findings.csv
            </button>
            <button
              onClick={() => triggerDownload(csvFiles['urls.csv'], `urls-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1.5 px-2 rounded bg-jet-950 hover:bg-jet-800 border border-jet-800 text-slate-300 hover:text-white truncate transition-colors"
            >
              urls.csv
            </button>
            <button
              onClick={() => triggerDownload(csvFiles['keywords.csv'], `keywords-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1.5 px-2 rounded bg-jet-950 hover:bg-jet-800 border border-jet-800 text-slate-300 hover:text-white truncate transition-colors"
            >
              keywords.csv
            </button>
            <button
              onClick={() => triggerDownload(csvFiles['structured-data.csv'], `schemas-${cleanDomain}.csv`, true)}
              className="text-[11px] font-semibold py-1.5 px-2 rounded bg-jet-950 hover:bg-jet-800 border border-jet-800 text-slate-300 hover:text-white truncate transition-colors"
            >
              schemas.csv
            </button>
          </div>
        </Card>
      </div>

      {/* Auto-generated ready-to-deploy files */}
      <Card className="p-4 sm:p-6 bg-jet-900 border-jet-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center font-orbitron">
          <Sparkles className="h-4 w-4 mr-2 text-cerulean" />
          Auto-Generated Ready-to-Deploy Files
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Pre-configured configuration files ready to drop directly into your website public/root directory.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['robots.txt'], 'robots.txt', true)}
            className="text-xs justify-start bg-jet-950 border-jet-800 text-slate-300 hover:text-cerulean hover:border-cerulean/40"
          >
            <FileText className="h-3.5 w-3.5 mr-2 text-cerulean" />
            robots.txt
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['sitemap.xml'], 'sitemap.xml', true)}
            className="text-xs justify-start bg-jet-950 border-jet-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40"
          >
            <FileCode className="h-3.5 w-3.5 mr-2 text-emerald-400" />
            sitemap.xml
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['llms.txt'], 'llms.txt', true)}
            className="text-xs justify-start bg-jet-950 border-jet-800 text-slate-300 hover:text-neon hover:border-neon/40"
          >
            <Bot className="h-3.5 w-3.5 mr-2 text-neon" />
            llms.txt
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerDownload(deployableFiles['jsonld-snippets.json'], 'jsonld-snippets.json', true)}
            className="text-xs justify-start bg-jet-950 border-jet-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/40"
          >
            <Code2 className="h-3.5 w-3.5 mr-2 text-amber-400" />
            JSON-LD Snippets
          </Button>
        </div>
      </Card>
    </div>
  );
};
