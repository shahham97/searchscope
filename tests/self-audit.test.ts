import { describe, it, expect } from 'vitest';
import { analyzeTechnicalSeo } from '../src/lib/analyzer/technical-seo';
import { analyzeOnPageSeo } from '../src/lib/analyzer/onpage-seo';
import { analyzeStructuredData } from '../src/lib/analyzer/structured-data';
import { analyzeAeo } from '../src/lib/analyzer/aeo';
import { analyzeGeo } from '../src/lib/analyzer/geo';
import { analyzeMobileAndRenderingParity } from '../src/lib/analyzer/mobile-parity';
import { calculateAuditScores } from '../src/lib/analyzer/scoring';
import { ExtractedPageData } from '../src/types/audit';

describe('Part F: SearchScope Self-Audit Verification', () => {
  it('passes all audit engines cleanly on SearchScope self-inspection', () => {
    // Model SearchScope home page and bot documentation page
    const homePage: ExtractedPageData = {
      url: 'https://searchscope.app/',
      normalizedUrl: 'https://searchscope.app/',
      statusCode: 200,
      statusText: 'OK',
      fetchDurationMs: 45,
      contentType: 'text/html; charset=utf-8',
      contentLengthBytes: 24500,
      isHtml: true,
      title: 'SearchScope — Website SEO, AEO & GEO Auditor',
      titleLength: 44,
      metaDescription:
        'Production-grade SEO, AEO, and GEO website auditor. Zero accounts, zero paid API keys, and 100% private transient execution.',
      metaDescriptionLength: 124,
      canonicalUrl: 'https://searchscope.app/',
      robotsDirectives: ['index', 'follow'],
      lang: 'en',
      viewport: 'width=device-width, initial-scale=1',
      isHttps: true,
      hasCompression: true,
      domElementCount: 220,
      renderBlockingResourceCount: 0,
      ogTitle: 'SearchScope — Website SEO, AEO & GEO Auditor',
      ogDescription: 'Production-grade SEO, AEO, and GEO website auditor.',
      ogImage: 'https://searchscope.app/og.png',
      h1s: ['100% Private Website Audits. Nothing Is Saved.'],
      h2s: ['How to Control or Block SearchScope in robots.txt', 'IP Ranges & Egress Network'],
      h3s: [],
      headingHierarchyValid: true,
      headingIssues: [],
      internalLinks: [
        { url: 'https://searchscope.app/bot', anchorText: 'Bot Transparency' },
      ],
      externalLinks: [],
      brokenInternalLinks: [],
      images: [],
      wordCount: 450,
      textSnippet:
        'SearchScope discovers and analyzes your accessible pages, technical SEO, structured data, information architecture, AEO, and GEO without requiring accounts, logins, or database storage.',
      detectedEntities: ['SearchScope'],
      hasFAQMarkupOrContent: true,
      hasDirectDefinitions: true,
      hasTablesOrLists: true,
      hasAuthorAttribution: true,
      hasContactOrAboutEvidence: true,
      structuredData: [
        {
          type: 'WebApplication',
          rawJson: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'SearchScope',
            url: 'https://searchscope.app',
            applicationCategory: 'BusinessApplication',
          }),
          isValid: true,
          errors: [],
          warnings: [],
          propertiesFound: ['name', 'url', 'applicationCategory'],
        },
      ],
    };

    const botPage: ExtractedPageData = {
      url: 'https://searchscope.app/bot',
      normalizedUrl: 'https://searchscope.app/bot',
      statusCode: 200,
      statusText: 'OK',
      fetchDurationMs: 50,
      contentType: 'text/html; charset=utf-8',
      contentLengthBytes: 18200,
      isHtml: true,
      title: 'SearchScope-Auditor Documentation | SearchScope',
      titleLength: 47,
      metaDescription:
        'Technical specifications for the SearchScope-Auditor crawler, politeness throttling, IP ranges, and robots.txt directives.',
      metaDescriptionLength: 124,
      canonicalUrl: 'https://searchscope.app/bot',
      robotsDirectives: ['index', 'follow'],
      lang: 'en',
      viewport: 'width=device-width, initial-scale=1',
      isHttps: true,
      hasCompression: true,
      domElementCount: 180,
      renderBlockingResourceCount: 0,
      ogTitle: 'SearchScope-Auditor Documentation',
      ogDescription: 'Technical specifications for SearchScope-Auditor crawler.',
      ogImage: 'https://searchscope.app/og.png',
      h1s: ['SearchScope-Auditor Documentation'],
      h2s: ['How to Control or Block SearchScope in robots.txt', 'IP Ranges & Egress Network'],
      h3s: ['Contact & Webmaster Support'],
      headingHierarchyValid: true,
      headingIssues: [],
      internalLinks: [
        { url: 'https://searchscope.app/', anchorText: 'Back to SearchScope Auditor' },
      ],
      externalLinks: [],
      brokenInternalLinks: [],
      images: [],
      wordCount: 650,
      textSnippet:
        'Information regarding the SearchScope-Auditor web crawler, its purpose, politeness standards, IP ranges, and robots.txt directives.',
      detectedEntities: ['SearchScope-Auditor'],
      hasFAQMarkupOrContent: true,
      hasDirectDefinitions: true,
      hasTablesOrLists: true,
      hasAuthorAttribution: true,
      hasContactOrAboutEvidence: true,
      structuredData: [],
    };

    const pages = [homePage, botPage];
    const sitemaps = ['https://searchscope.app/sitemap.xml'];

    // Run all analyzers
    const techFindings = analyzeTechnicalSeo(pages, sitemaps, true);
    const onpageFindings = analyzeOnPageSeo(pages);
    const schemaFindings = analyzeStructuredData(pages);
    const aeoFindings = analyzeAeo(pages);
    const geoFindings = analyzeGeo(pages, true);
    const mobileFindings = analyzeMobileAndRenderingParity(pages).findings;

    const allFindings = [
      ...techFindings,
      ...onpageFindings,
      ...schemaFindings,
      ...aeoFindings,
      ...geoFindings,
      ...mobileFindings,
    ];

    // Zero critical blockers
    const criticalFindings = allFindings.filter((f) => f.severity === 'critical');
    expect(criticalFindings.length).toBe(0);

    // Compute scores
    const { overallScore, categoryScores } = calculateAuditScores(allFindings, 2, false);

    // Score should be exceptional (>= 90)
    expect(overallScore).toBeGreaterThanOrEqual(90);

    // Verify key categories are in top tiers
    const techScore = categoryScores.find((c) => c.category === 'technical')?.score || 0;
    const onpageScore = categoryScores.find((c) => c.category === 'onpage')?.score || 0;
    expect(techScore).toBeGreaterThanOrEqual(90);
    expect(onpageScore).toBeGreaterThanOrEqual(90);
  });
});
