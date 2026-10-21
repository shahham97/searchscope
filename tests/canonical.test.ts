import { describe, it, expect } from 'vitest';
import { analyzeCanonicalsAndHosts } from '../src/lib/analyzer/canonical';
import { ExtractedPageData } from '../src/types/audit';

function createMockPage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://www.kingshyer.com/product/velvet-amber',
    normalizedUrl: 'https://www.kingshyer.com/product/velvet-amber',
    statusCode: 200,
    statusText: 'OK',
    fetchDurationMs: 120,
    contentType: 'text/html',
    contentLengthBytes: 5000,
    isHtml: true,
    title: 'Velvet Amber Oud',
    titleLength: 16,
    metaDescription: 'Description',
    metaDescriptionLength: 11,
    canonicalUrl: 'https://www.kingshyer.com/product/velvet-amber',
    robotsDirectives: [],
    h1s: ['Velvet Amber'],
    h2s: [],
    h3s: [],
    headingHierarchyValid: true,
    headingIssues: [],
    internalLinks: [],
    externalLinks: [],
    brokenInternalLinks: [],
    images: [],
    wordCount: 400,
    textSnippet: 'Text',
    detectedEntities: [],
    hasFAQMarkupOrContent: false,
    hasDirectDefinitions: false,
    hasTablesOrLists: false,
    hasAuthorAttribution: false,
    hasContactOrAboutEvidence: false,
    structuredData: [],
    isHttps: true,
    hasCompression: true,
    renderBlockingResourceCount: 0,
    domElementCount: 50,
    ...overrides,
  };
}

describe('Canonical & Host Consistency Analyzer', () => {
  it('detects when canonical points to an apex URL that redirects back to www (High)', () => {
    const page = createMockPage({
      url: 'https://www.kingshyer.com/product/velvet-amber',
      canonicalUrl: 'https://kingshyer.com/product/velvet-amber',
      ogUrl: 'https://kingshyer.com/product/velvet-amber',
      ogImage: 'https://kingshyer.com/images/card.jpg',
      redirectChain: ['https://kingshyer.com/product/velvet-amber', 'https://www.kingshyer.com/product/velvet-amber'],
    });

    const findings = analyzeCanonicalsAndHosts([page]);
    const redirectFinding = findings.find((f) => f.id.includes('CANONICAL-POINTS-TO-REDIRECT'));
    expect(redirectFinding).toBeDefined();
    expect(redirectFinding?.severity).toBe('high');
    expect(redirectFinding?.evidence).toContain('kingshyer.com');
    expect(redirectFinding?.evidence).toContain('www.kingshyer.com');
    expect(redirectFinding?.implementationExample).toContain('metadataBase');

    const ogFinding = findings.find((f) => f.id.includes('SOCIAL-OG-URL-HOST-MISMATCH'));
    expect(ogFinding).toBeDefined();
  });

  it('detects multiple canonical tags and canonical in body', () => {
    const page = createMockPage({
      multipleCanonicalsCount: 2,
      hasCanonicalInBody: true,
    });

    const findings = analyzeCanonicalsAndHosts([page]);
    expect(findings.some((f) => f.id.includes('CANONICAL-MULTIPLE'))).toBe(true);
    expect(findings.some((f) => f.id.includes('CANONICAL-IN-BODY'))).toBe(true);
  });

  it('detects sitemap host vs canonical host mismatch', () => {
    const page = createMockPage({
      url: 'https://www.kingshyer.com/product/velvet-amber',
      canonicalUrl: 'https://kingshyer.com/product/velvet-amber',
    });

    const findings = analyzeCanonicalsAndHosts([page], {
      sitemapsFound: ['https://www.kingshyer.com/sitemap.xml'],
      sitemapDiscoveredUrls: ['https://www.kingshyer.com/product/velvet-amber'],
    });

    expect(findings.some((f) => f.id.includes('CANONICAL-SITEMAP-HOST-CONFLICT'))).toBe(true);
  });

  it('detects canonical pointing to an error page (HTTP 404)', () => {
    const goodPage = createMockPage({
      url: 'https://www.kingshyer.com/product/old-page',
      canonicalUrl: 'https://www.kingshyer.com/product/broken-target',
    });
    const brokenPage = createMockPage({
      url: 'https://www.kingshyer.com/product/broken-target',
      statusCode: 404,
    });

    const findings = analyzeCanonicalsAndHosts([goodPage, brokenPage]);
    expect(findings.some((f) => f.id.includes('CANONICAL-POINTS-TO-ERROR'))).toBe(true);
  });
});
