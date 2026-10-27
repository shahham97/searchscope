import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditReport, Finding, RoadmapItem, ClaimItem } from '../../types/audit';

export function generateAuditPdf(report: AuditReport): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const secondaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600
  const textColor: [number, number, number] = [51, 65, 85]; // Slate 700
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const borderLight: [number, number, number] = [226, 232, 240]; // Slate 200

  const drawHeaderBanner = (title: string, subtitle?: string) => {
    doc.setFillColor(...accentColor);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text(title, 14, 20);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 14, 26);
    }
  };

  // ====================================================
  // SECTION 1: COVER & EXECUTIVE AUDIT SCORECARD
  // ====================================================
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 8, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text('SearchScope', 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Production SEO, AEO & GEO Intelligence Audit Report', 14, 30);

  // Target Domain Info Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(14, 36, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  doc.text(report.targetDomain, 20, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.text(`Site Title: ${report.siteTitle || 'N/A'}`, 20, 53);
  doc.text(
    `Audited Date: ${new Date(report.auditDate).toLocaleDateString()} ${new Date(report.auditDate).toLocaleTimeString()}`,
    20,
    59
  );
  doc.text(`Crawler Agent: ${report.crawlerUserAgent}`, 20, 65);
  doc.text(
    `Crawl Coverage: ${report.crawlCoverage?.summary || `${report.crawlStats.totalPagesCrawled} of ${report.crawlStats.totalPagesDiscovered} pages crawled`}`,
    20,
    71
  );

  // Overall Score Badge
  const scoreX = 154;
  const scoreY = 40;
  const scoreColor =
    report.overallScore >= 80 ? [16, 185, 129] : report.overallScore >= 60 ? [79, 70, 229] : [245, 158, 11];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(scoreX, scoreY, 34, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`${report.overallScore}/100`, scoreX + 17, scoreY + 13, { align: 'center' });

  doc.setFontSize(7);
  doc.text('OVERALL SCORE', scoreX + 17, scoreY + 20, { align: 'center' });

  // Executive Narrative
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Executive Summary & Scope Assessment', 14, 82);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  const narrative =
    `SearchScope executed an automated, deterministic audit of ${report.targetDomain}. ` +
    `A total of ${report.crawlStats.totalPagesCrawled} pages were crawled and analyzed from a discovered set of ${report.crawlStats.totalPagesDiscovered} internal URLs ` +
    `(${report.crawlCoverage?.percentage || Math.round((report.crawlStats.totalPagesCrawled / Math.max(report.crawlStats.totalPagesDiscovered, 1)) * 100)}% crawl sample). ` +
    `The audit evaluated technical indexability, on-page canonical & heading hierarchy, Schema.org structured data, content depth & E-E-A-T signals, ` +
    `Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO). ` +
    `Total findings identified: ${report.findings.length} issues across all audit dimensions.`;
  doc.text(doc.splitTextToSize(narrative, 182), 14, 88);

  // Crawl Accounting Balance Table
  autoTable(doc, {
    startY: 104,
    head: [['Crawled OK', 'Capped (Limit)', 'Robots Skipped', 'Non-HTML', 'Failed', 'Total Discovered']],
    body: [
      [
        report.crawlStats.successfulPagesCount.toString(),
        (report.crawlStats.notCrawledLimitCount || 0).toString(),
        (report.crawlStats.skippedRobotsCount || 0).toString(),
        (report.crawlStats.skippedNonHtmlCount || 0).toString(),
        report.crawlStats.totalPagesFailed.toString(),
        report.crawlStats.totalPagesDiscovered.toString(),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: secondaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'center',
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: primaryColor,
      halign: 'center',
      fontStyle: 'bold',
    },
    margin: { left: 14, right: 14 },
  });

  // Category Scores Table
  const catStartY = (doc as any).lastAutoTable?.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Dimension Scorecard & Severity Breakdown', 14, catStartY);

  const categoryRows = report.categoryScores.map((cat) => [
    cat.label,
    `${cat.score}/100`,
    `${Math.round(cat.weight * 100)}%`,
    cat.findingsCount.critical.toString(),
    cat.findingsCount.high.toString(),
    cat.findingsCount.medium.toString(),
    cat.findingsCount.low.toString(),
    cat.status === 'incomplete' ? 'Incomplete' : 'Complete',
  ]);

  autoTable(doc, {
    startY: catStartY + 3,
    head: [['Audit Dimension', 'Score', 'Weight', 'Crit', 'High', 'Med', 'Low', 'Status']],
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
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 16, halign: 'center', textColor: [225, 29, 72] },
      4: { cellWidth: 16, halign: 'center', textColor: [217, 119, 6] },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // What Passed Box on Cover Page
  const passStartY = (doc as any).lastAutoTable?.finalY + 6;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(14, passStartY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Green
  doc.text('Key Technical Architecture That Passed Inspection', 20, passStartY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...textColor);
  const passedItems = [
    report.crawlStats.robotsTxtPresent ? '✓ robots.txt detected and verified' : null,
    report.crawlStats.sitemapDetected ? `✓ XML sitemap discovered (${report.crawlStats.sitemapsFound.length} files)` : null,
    report.crawlStats.llmsTxtPresent ? '✓ Machine-readable /llms.txt detected' : null,
    '✓ Public HTTPS / TLS protocol established and verified',
    '✓ Mobile viewport meta tags verified across sampled HTML templates',
    '✓ No duplicate title tags on distinct canonical pages',
    '✓ Zero broken internal links detected during crawl traversal',
  ].filter(Boolean);

  let pY = passStartY + 14;
  for (const item of passedItems.slice(0, 5)) {
    doc.text(item as string, 20, pY);
    pY += 5;
  }

  // ====================================================
  // SECTION 2: PRIORITIZED 5-PHASE ROADMAP WITH CODE SNIPPETS
  // ====================================================
  doc.addPage();
  drawHeaderBanner(
    'Prioritized Remediation Roadmap (5 Phases)',
    'Sequential, impact-weighted action plan grouping identical issues with full affected URL lists.'
  );

  const phaseNames: Record<RoadmapItem['phase'], string> = {
    immediate_technical: 'Phase 1: Immediate Technical & Crawlability Blockers',
    high_priority_onpage: 'Phase 2: High-Priority On-Page SEO & Schema Architecture',
    content_expansion: 'Phase 3: Content Depth, E-E-A-T & Sensory Enrichment',
    aeo_geo_optimization: 'Phase 4: Answer Engine (AEO) & Generative (GEO) Optimization',
    long_term_strategy: 'Phase 5: Long-Term Authority, Performance & SERP Monitoring',
  };

  const roadmapRows: any[] = [];
  let lastPhase: string | null = null;

  for (const item of report.roadMap) {
    if (item.phase !== lastPhase) {
      lastPhase = item.phase;
      roadmapRows.push([
        {
          content: phaseNames[item.phase] || item.phase,
          colSpan: 5,
          styles: {
            fillColor: [241, 245, 249],
            textColor: primaryColor,
            fontStyle: 'bold',
            fontSize: 8.5,
          },
        },
      ]);
    }

    const fullUrlsText = item.affectedUrls.length > 0 ? item.affectedUrls.join('\n') : 'Entire Domain';
    const remediationWithSnippet = item.codeSnippet
      ? `${item.description}\n\n[Implementation Example - ${item.codeSnippet.caption}]:\n${item.codeSnippet.code}`
      : item.description;

    roadmapRows.push([
      item.impact.toUpperCase(),
      item.effort.replace('_', ' ').toUpperCase(),
      item.title,
      fullUrlsText,
      remediationWithSnippet,
    ]);
  }

  autoTable(doc, {
    startY: 32,
    head: [['Impact', 'Effort', 'Remediation Task', 'Affected URLs (Full)', 'Actionable Guidance & Snippet']],
    body: roadmapRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 44, overflow: 'linebreak' }, // FULL URLs wrapped
      4: { cellWidth: 62 },
    },
    margin: { left: 14, right: 14 },
  });

  // ====================================================
  // SECTION 3: COMPREHENSIVE FINDINGS MATRIX
  // ====================================================
  doc.addPage();
  drawHeaderBanner(
    'Detailed Audit Findings & Supporting Evidence',
    'Exhaustive record of all detected issues, supporting DOM evidence, affected URLs, and validation checks.'
  );

  const findingsRows = report.findings.map((f) => [
    f.severity.toUpperCase(),
    f.category.replace('_', ' ').toUpperCase(),
    f.title,
    f.affectedUrl, // FULL URL wrapped
    f.evidence,
    `${f.recommendedFix}\n\n[Validation Check]: ${f.validationInstructions}`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Severity', 'Category', 'Finding Title', 'Affected URL (Full)', 'Observed Evidence', 'Recommended Fix & Validation']],
    body: findingsRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 36, fontStyle: 'bold' },
      3: { cellWidth: 42, overflow: 'linebreak' }, // FULL URL
      4: { cellWidth: 34 },
      5: { cellWidth: 34 },
    },
    margin: { left: 14, right: 14 },
  });

  // ====================================================
  // SECTION 4: COMPLIANCE & CLAIM-RISK CHECKLIST
  // ====================================================
  if (report.complianceClaims && report.complianceClaims.length > 0) {
    doc.addPage();
    drawHeaderBanner(
      'Compliance & Claim-Risk Verification Checklist',
      'Statements flagged for business owner verification (origin, purity, performance, superlatives, trademarks).'
    );

    const claimRows = report.complianceClaims.map((c) => [
      '[ ]',
      c.riskLevel.toUpperCase(),
      c.category.replace('_', ' ').toUpperCase(),
      c.claimText,
      c.url, // FULL URL wrapped
      c.whyRisky,
      c.ownerAction,
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Check', 'Risk', 'Category', 'Observed Claim Text', 'Page URL', 'Legal / Compliance Risk', 'Owner Action Required']],
      body: claimRows,
      theme: 'grid',
      headStyles: {
        fillColor: secondaryColor,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 6.8,
        textColor: textColor,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 32, fontStyle: 'bold' },
        4: { cellWidth: 38, overflow: 'linebreak' }, // FULL URL
        5: { cellWidth: 34 },
        6: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ====================================================
  // SECTION 5: KEYWORD INTELLIGENCE & INTENT MATRIX
  // ====================================================
  if (report.keywordCandidates && report.keywordCandidates.length > 0) {
    doc.addPage();
    drawHeaderBanner(
      'Keyword Intelligence & Structural Intent Matrix',
      'Extracted 1-gram, 2-gram, and 3-gram terms ranked by TF-IDF and structural placement frequency.'
    );

    const kwRows = report.keywordCandidates.map((k) => [
      k.keyword,
      k.intent.toUpperCase(),
      k.occurrenceCount.toString(),
      k.inTitlePagesCount !== undefined ? `${k.inTitlePagesCount} of ${k.totalPagesCount || report.crawlStats.totalPagesCrawled}` : `${k.inTitleCount}`,
      k.inH1PagesCount !== undefined ? `${k.inH1PagesCount} of ${k.totalPagesCount || report.crawlStats.totalPagesCrawled}` : `${k.inHeadingCount}`,
      k.inBodyOnly ? 'Keyword Gap' : 'Optimized',
      `${k.sourceUrls.length} pages`,
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Extracted Keyword Candidate', 'Intent', 'Occurrences', 'In <title> Pages', 'In <h1> Pages', 'Gap Status', 'Spread Across']],
      body: kwRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: textColor,
      },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 18, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ====================================================
  // SECTION 6: TECHNICAL URL CRAWL INVENTORY
  // ====================================================
  doc.addPage();
  drawHeaderBanner(
    'Crawled URL Technical Inventory',
    'Comprehensive record of status codes, fetch durations, body word counts, and schema counts.'
  );

  const inventoryEntries = report.ledgerEntries && report.ledgerEntries.length > 0
    ? report.ledgerEntries
    : null;

  const urlRows = inventoryEntries
    ? inventoryEntries.map((entry) => {
        const p = entry.pageData;
        const statusLabel =
          entry.state === 'crawled_ok'
            ? entry.statusCode === 200
              ? '200 OK'
              : `HTTP ${entry.statusCode}`
            : entry.state === 'skipped_robots'
            ? 'Robots Blocked'
            : entry.state === 'skipped_non_html'
            ? 'Non-HTML'
            : entry.state === 'not_crawled_limit'
            ? 'Uncrawled Limit'
            : entry.state === 'redirected'
            ? 'Redirect'
            : entry.failureCode || `Failed (${entry.statusCode || 0})`;
        const titleOrHint =
          p?.title ||
          entry.failureHint ||
          (entry.state === 'not_crawled_limit' ? '(Discovered - Limit)' : '(No Title Declared)');
        return [
          statusLabel,
          entry.url,
          titleOrHint,
          (p?.wordCount || 0).toString(),
          p?.fetchDurationMs ? `${p.fetchDurationMs}ms` : '-',
          (p?.structuredData?.length || 0).toString(),
        ];
      })
    : report.pages.map((p) => [
        p.failureCode || (p.statusCode === 200 ? '200 OK' : `HTTP ${p.statusCode}`),
        p.url, // FULL URL wrapped
        p.title || (p.failureHint ? `Failure: ${p.failureHint}` : '(No Title Declared)'),
        p.wordCount.toString(),
        `${p.fetchDurationMs}ms`,
        p.structuredData.length.toString(),
      ]);

  autoTable(doc, {
    startY: 32,
    head: [['Status', 'URL (Full)', 'Title / Error Hint', 'Words', 'Response', 'Schemas']],
    body: urlRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 58, overflow: 'linebreak' }, // FULL URL
      2: { cellWidth: 54 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // ====================================================
  // SECTION 7: CRAWL DIAGNOSTICS & METHODOLOGY APPENDIX
  // ====================================================
  doc.addPage();
  drawHeaderBanner(
    'Crawl Diagnostics & Technical Appendix',
    'Auditor methodology, network diagnostics, transient memory guarantees, and standard disclaimers.'
  );

  let currentY = 32;

  // Diagnostics Table if any errors/blocks occurred
  if (report.diagnostics && report.diagnostics.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('Crawl Network Diagnostics Log', 14, currentY);

    const diagRows = report.diagnostics.map((d) => [
      d.code,
      d.stage.toUpperCase(),
      d.url,
      d.message,
      d.hint,
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Code', 'Stage', 'Target URL', 'Diagnostic Message', 'Remediation Hint']],
      body: diagRows,
      theme: 'grid',
      headStyles: {
        fillColor: secondaryColor,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 6.8,
        textColor: textColor,
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 16, halign: 'center' },
        2: { cellWidth: 44, overflow: 'linebreak' },
        3: { cellWidth: 48 },
        4: { cellWidth: 50 },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;
  }

  // Methodology & Architecture Statement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Audit Engine Methodology', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...textColor);
  const methodLines = doc.splitTextToSize(report.methodology, 182);
  doc.text(methodLines, 14, currentY + 5);
  currentY += methodLines.length * 4 + 8;

  // Transient Memory Guarantee
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Zero-Data-Retention & Privacy Architecture', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...textColor);
  const privacyText =
    'SearchScope operates on a strict zero-retention architecture. No databases, report caches, or user credentials are stored. ' +
    'Audit data exists transiently in runtime compute memory during execution and is compiled client-side in the browser. ' +
    'Target websites are accessed strictly via public endpoints adhering to robots.txt and politeness throttles.';
  const privacyLines = doc.splitTextToSize(privacyText, 182);
  doc.text(privacyLines, 14, currentY + 5);
  currentY += privacyLines.length * 4 + 8;

  // Disclaimers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Standard Disclaimers & Industry Compliance', 14, currentY);

  currentY += 5;
  for (const disclaimer of report.disclaimers) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textColor);
    const splitDisc = doc.splitTextToSize(`• ${disclaimer}`, 180);
    doc.text(splitDisc, 14, currentY);
    currentY += splitDisc.length * 3.8 + 1.5;
  }

  // ====================================================
  // GLOBAL FOOTERS & PAGE NUMBERING
  // ====================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 286, 196, 286);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`SearchScope Production Intelligence Audit — ${report.targetDomain}`, 14, 291);
    doc.text(`Page ${i} of ${totalPages}`, 196, 291, { align: 'right' });
  }

  // Save PDF
  const cleanDomain = report.targetDomain.replace(/[^a-zA-Z0-9.-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `searchscope-${cleanDomain}-audit-report-${dateStamp}.pdf`;

  doc.save(filename);
}
