import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditReport } from '../../types/audit';

export function generateAuditPdf(report: AuditReport): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600
  const textColor: [number, number, number] = [51, 65, 85]; // Slate 700
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50

  // ----------------------------------------------------
  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // ----------------------------------------------------
  // Top accent bar
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 8, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text('SearchScope', 14, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Production-Grade SEO, AEO & GEO Intelligence Report', 14, 31);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 36, 196, 36);

  // Target Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 42, 182, 34, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(report.targetDomain, 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text(`Title: ${report.siteTitle || 'N/A'}`, 20, 59);
  doc.text(`Audit Date: ${new Date(report.auditDate).toLocaleDateString()} ${new Date(report.auditDate).toLocaleTimeString()}`, 20, 66);
  doc.text(`Crawler: ${report.crawlerUserAgent}`, 20, 72);

  // Overall Score Badge
  const scoreX = 155;
  const scoreY = 48;
  doc.setFillColor(...accentColor);
  doc.roundedRect(scoreX, scoreY, 32, 22, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${report.overallScore}/100`, scoreX + 16, scoreY + 11, { align: 'center' });

  doc.setFontSize(7);
  doc.text('OVERALL SCORE', scoreX + 16, scoreY + 17, { align: 'center' });

  // Executive Summary text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Executive Summary', 14, 86);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  const summaryText =
    `SearchScope completed an automated, deterministic audit of ${report.targetDomain}. ` +
    `A total of ${report.crawlStats.totalPagesCrawled} pages were crawled and analyzed from ${report.crawlStats.totalPagesDiscovered} discovered internal URLs. ` +
    `The audit evaluated technical foundation, on-page structure, Schema.org structured data, Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO). ` +
    `Overall domain search health scored ${report.overallScore} out of 100 based on ${report.findings.length} total findings.`;
  const splitSummary = doc.splitTextToSize(summaryText, 182);
  doc.text(splitSummary, 14, 93);

  // Category Scores Table
  const categoryRows = report.categoryScores.map((cat) => [
    cat.label,
    `${cat.score}/100`,
    `${Math.round(cat.weight * 100)}%`,
    cat.findingsCount.critical.toString(),
    cat.findingsCount.high.toString(),
    cat.findingsCount.medium.toString(),
    cat.findingsCount.low.toString(),
  ]);

  autoTable(doc, {
    startY: 110,
    head: [['Audit Dimension', 'Score', 'Weight', 'Crit', 'High', 'Med', 'Low']],
    body: categoryRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center', textColor: [225, 29, 72] }, // Critical
      4: { cellWidth: 18, halign: 'center', textColor: [217, 119, 6] }, // High
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Crawl Statistics Box
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Crawl Coverage & Environment', 14, finalY + 12);

  const crawlInfoRows = [
    ['Pages Discovered', report.crawlStats.totalPagesDiscovered.toString()],
    ['Pages Crawled', report.crawlStats.totalPagesCrawled.toString()],
    ['Pages Skipped / Failed', `${report.crawlStats.totalPagesSkipped} skipped, ${report.crawlStats.totalPagesFailed} failed`],
    ['Crawl Duration', `${(report.crawlStats.crawlDurationMs / 1000).toFixed(1)} seconds`],
    ['Robots.txt Status', report.crawlStats.robotsTxtPresent ? 'Present and verified' : 'Not detected at domain root'],
    ['XML Sitemap Status', report.crawlStats.sitemapDetected ? `Detected (${report.crawlStats.sitemapsFound.length} files)` : 'Not detected'],
    ['llms.txt (GEO Signal)', report.crawlStats.llmsTxtPresent ? 'Present (/llms.txt)' : 'Not detected'],
  ];

  autoTable(doc, {
    startY: finalY + 16,
    body: crawlInfoRows,
    theme: 'plain',
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 120 },
    },
    margin: { left: 14, right: 14 },
  });

  // ----------------------------------------------------
  // PAGE 2: PRIORITIZED IMPLEMENTATION ROADMAP
  // ----------------------------------------------------
  doc.addPage();
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('Prioritized Action Roadmap', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Step-by-step remediation actions ordered by business impact and implementation effort.', 14, 28);

  const roadmapRows = report.roadMap.slice(0, 15).map((item, idx) => [
    `#${idx + 1}`,
    item.impact.toUpperCase(),
    item.effort.replace('_', ' ').toUpperCase(),
    item.title,
    item.description,
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Impact', 'Effort', 'Action Item', 'Remediation Summary']],
    body: roadmapRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 45, fontStyle: 'bold' },
      4: { cellWidth: 85 },
    },
    margin: { left: 14, right: 14 },
  });

  // ----------------------------------------------------
  // PAGE 3: KEY AUDIT FINDINGS WITH EVIDENCE
  // ----------------------------------------------------
  doc.addPage();
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('Key Audit Findings & Supporting Evidence', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Detailed findings filtered by severity with affected URLs and recommended solutions.', 14, 28);

  const findingRows = report.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium')
    .slice(0, 18)
    .map((f) => [
      f.severity.toUpperCase(),
      f.category.replace('_', ' ').toUpperCase(),
      f.title,
      f.affectedUrl.length > 40 ? `${f.affectedUrl.substring(0, 40)}...` : f.affectedUrl,
      f.evidence,
      f.recommendedFix,
    ]);

  autoTable(doc, {
    startY: 34,
    head: [['Severity', 'Category', 'Issue Title', 'Affected URL', 'Observed Evidence', 'Recommended Solution']],
    body: findingRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 38 },
      5: { cellWidth: 37 },
    },
    margin: { left: 14, right: 14 },
  });

  // ----------------------------------------------------
  // PAGE 4: URL AUDIT EXPLORER & KEYWORDS
  // ----------------------------------------------------
  doc.addPage();
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('Crawled URLs & Content Health', 14, 22);

  const urlRows = report.pages.slice(0, 20).map((p) => [
    p.statusCode.toString(),
    p.url.length > 50 ? `${p.url.substring(0, 50)}...` : p.url,
    p.title ? (p.title.length > 30 ? `${p.title.substring(0, 30)}...` : p.title) : '(Missing)',
    p.wordCount.toString(),
    `${p.fetchDurationMs}ms`,
    p.structuredData.length.toString(),
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Status', 'URL', 'Title', 'Words', 'Response', 'Schemas']],
    body: urlRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 55 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Keyword Candidates Table
  const finalUrlY = (doc as any).lastAutoTable?.finalY || 160;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Candidate Keyword Themes (Observable Structural Evidence)', 14, finalUrlY + 12);

  const kwRows = report.keywordCandidates.slice(0, 10).map((k) => [
    k.keyword,
    k.intent.toUpperCase(),
    k.occurrenceCount.toString(),
    k.inTitleCount > 0 ? 'Yes' : 'No',
    k.inHeadingCount > 0 ? 'Yes' : 'No',
  ]);

  autoTable(doc, {
    startY: finalUrlY + 16,
    head: [['Extracted Keyword Candidate', 'Search Intent', 'Occurrences', 'In Title', 'In Headings']],
    body: kwRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // ----------------------------------------------------
  // PAGE 5: METHODOLOGY, PRIVACY & LIMITATIONS
  // ----------------------------------------------------
  doc.addPage();
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('Methodology, Privacy & Data Provenance', 14, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('1. Audit Methodology', 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  const methodLines = doc.splitTextToSize(report.methodology, 182);
  doc.text(methodLines, 14, 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('2. Privacy & Transient Memory Model', 14, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  const privacyText =
    'SearchScope operates without user accounts, databases, or persistent server storage. ' +
    'The audit is performed in transient execution memory and downloaded directly to the browser. ' +
    'Refreshing or closing the session discards the active audit state completely. ' +
    'Hosting providers and edge servers may retain technical operational access logs according to standard infrastructure retention policies.';
  doc.text(doc.splitTextToSize(privacyText, 182), 14, 71);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('3. Explicit Disclaimers & Data Limitations', 14, 95);

  let discY = 102;
  for (const disclaimer of report.disclaimers) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    const splitDisc = doc.splitTextToSize(`• ${disclaimer}`, 178);
    doc.text(splitDisc, 16, discY);
    discY += splitDisc.length * 4.5 + 2;
  }

  // ----------------------------------------------------
  // ADD PAGE NUMBERS & FOOTERS TO ALL PAGES
  // ----------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 285, 196, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`SearchScope Audit Report — ${report.targetDomain}`, 14, 290);
    doc.text(`Page ${i} of ${totalPages}`, 196, 290, { align: 'right' });
  }

  // Sanitize filename
  const cleanDomain = report.targetDomain.replace(/[^a-zA-Z0-9.-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `searchscope-${cleanDomain}-audit-${dateStamp}.pdf`;

  doc.save(filename);
}
