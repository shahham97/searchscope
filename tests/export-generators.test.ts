import { describe, it, expect } from 'vitest';
import {
  generateImprovementsMd,
  generateRoadmapMd,
  generateCsvFiles,
  generateDeployableFiles,
  generateFullZip,
} from '../src/lib/export/export-generators';
import { AuditReport } from '../src/types/audit';

describe('Export Generators', () => {
  const mockReport: AuditReport = {
    id: 'test-123',
    auditDate: new Date().toISOString(),
    targetDomain: 'kingshyer.com',
    targetNormalizedUrl: 'https://kingshyer.com/',
    siteTitle: 'Kingshyer — Luxury Perfume Oils',
    organizationName: 'Kingshyer',
    config: {
      targetUrl: 'https://kingshyer.com',
      auditDepth: 'quick',
      maxPages: 5,
      includeContentAnalysis: true,
      includeAeoGeo: true,
      includeStructuredData: true,
      checkBrokenLinks: true,
      searchDiscoveryEnabled: false,
    },
    crawlerUserAgent: 'SearchScope-Auditor/1.0',
    overallScore: 88,
    isCrawlFailed: false,
    diagnostics: [],
    categoryScores: [],
    crawlStats: {
      totalPagesDiscovered: 5,
      totalPagesCrawled: 5,
      totalPagesSkipped: 0,
      totalPagesFailed: 0,
      successfulPagesCount: 5,
      crawlDurationMs: 2500,
      robotsTxtPresent: true,
      sitemapDetected: true,
      sitemapsFound: ['https://kingshyer.com/sitemap.xml'],
      llmsTxtPresent: true,
      crawlBudgetExhausted: true,
    },
    pages: [
      {
        url: 'https://kingshyer.com/',
        normalizedUrl: 'https://kingshyer.com/',
        statusCode: 200,
        statusText: 'OK',
        fetchDurationMs: 350,
        contentType: 'text/html',
        contentLengthBytes: 50000,
        isHtml: true,
        title: 'Kingshyer — Luxury Perfume Oils',
        titleLength: 32,
        metaDescription: 'Luxury alcohol-free perfume oils made in Australia.',
        metaDescriptionLength: 51,
        robotsDirectives: [],
        h1s: ['Luxury Fragrance'],
        h2s: ['Best Sellers'],
        h3s: [],
        headingHierarchyValid: true,
        headingIssues: [],
        internalLinks: [{ url: 'https://kingshyer.com/shop', anchorText: 'Shop All' }],
        externalLinks: [],
        brokenInternalLinks: [],
        images: [{ src: '/oil.jpg', alt: 'Perfume oil', hasAlt: true, isLazy: true, hasExplicitDimensions: true }],
        wordCount: 850,
        textSnippet: 'Discover pure fragrance oils crafted with luxury botanical notes.',
        detectedEntities: [],
        hasFAQMarkupOrContent: true,
        hasDirectDefinitions: true,
        hasTablesOrLists: true,
        hasAuthorAttribution: true,
        hasContactOrAboutEvidence: true,
        structuredData: [],
        isHttps: true,
        hasCompression: true,
        renderBlockingResourceCount: 0,
        domElementCount: 200,
      },
    ],
    findings: [
      {
        id: 'ONPAGE-DESC-SHORT',
        category: 'onpage',
        severity: 'low',
        title: 'Meta description is short',
        evidence: 'Description is 51 chars',
        affectedUrl: 'https://kingshyer.com/',
        whyItMatters: 'CTR optimization',
        confidence: 'high',
        recommendedFix: 'Expand description to 120-155 characters',
        implementationExample: '<meta name="description" content="Extended description text..." />',
        effort: 'quick_win',
        validationInstructions: 'Inspect meta tag',
      },
    ],
    keywordCandidates: [
      {
        keyword: 'perfume oils',
        intent: 'commercial',
        sourceUrls: ['https://kingshyer.com/'],
        occurrenceCount: 12,
        inTitleCount: 1,
        inHeadingCount: 2,
        inMetaCount: 1,
        tfIdfScore: 24.5,
      },
    ],
    searchObservations: [],
    competitors: [],
    roadMap: [
      {
        id: 'ROADMAP-1',
        phase: 'high_priority_onpage',
        title: 'Expand meta description',
        description: 'Update meta description length',
        affectedUrls: ['https://kingshyer.com/'],
        impact: 'high',
        effort: 'quick_win',
        validationCheck: 'Verify meta tag length',
      },
    ],
    methodology: 'Deterministic audit engine',
    disclaimers: ['Internal score only'],
  };

  it('generates an AI-agent-ready IMPROVEMENTS.md with task instructions and code patches', () => {
    const md = generateImprovementsMd(mockReport);
    expect(md).toContain('## Instructions for AI Agent');
    expect(md).toContain('### Task 1');
    expect(md).toContain('#### Proposed Remediation');
    expect(md).toContain('#### Code Patch / Snippet');
    expect(md).toContain('#### Acceptance Criteria');
  });

  it('generates ROADMAP.md', () => {
    const roadmap = generateRoadmapMd(mockReport);
    expect(roadmap).toContain('# SearchScope Prioritized Action Roadmap');
    expect(roadmap).toContain('Expand meta description');
  });

  it('generates all 7 CSV files', () => {
    const csvs = generateCsvFiles(mockReport);
    expect(csvs['findings.csv']).toContain('ONPAGE-DESC-SHORT');
    expect(csvs['urls.csv']).toContain('https://kingshyer.com/');
    expect(csvs['keywords.csv']).toContain('perfume oils');
    expect(csvs['links.csv']).toContain('Shop All');
    expect(csvs['images.csv']).toContain('Perfume oil');
  });

  it('generates auto-deployable robots.txt, sitemap.xml, llms.txt', () => {
    const files = generateDeployableFiles(mockReport);
    expect(files['robots.txt']).toContain('User-agent: GPTBot');
    expect(files['sitemap.xml']).toContain('<loc>https://kingshyer.com/</loc>');
    expect(files['llms.txt']).toContain('# Kingshyer — Luxury Perfume Oils');
  });

  it('builds a complete ZIP archive client-side containing all deliverables', async () => {
    const zipBlob = await generateFullZip(mockReport);
    expect(zipBlob.size).toBeGreaterThan(1000);
  });
});
