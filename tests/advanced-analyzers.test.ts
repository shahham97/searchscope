import { describe, it, expect } from 'vitest';
import { analyzeImageAltQuality } from '../src/lib/analyzer/image-quality';
import { analyzeTextQualityAndTypos } from '../src/lib/analyzer/typo-detector';
import { analyzeFacetedAndFallbackUrls } from '../src/lib/analyzer/faceted-urls';
import { analyzeContentSimilarity } from '../src/lib/analyzer/similarity';
import { analyzeWeakAndAmbiguousLinks } from '../src/lib/analyzer/weak-links';
import { analyzeSchemaDomParity } from '../src/lib/analyzer/schema-parity';
import { analyzeSocialMetadata } from '../src/lib/analyzer/social-metadata';
import { ExtractedPageData } from '../src/types/audit';

function mockPage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://www.kingshyer.com/product/velvet-amber',
    normalizedUrl: 'https://www.kingshyer.com/product/velvet-amber',
    statusCode: 200,
    statusText: 'OK',
    fetchDurationMs: 100,
    contentType: 'text/html',
    contentLengthBytes: 3000,
    isHtml: true,
    title: 'Velvet Amber | KingShyer Australia',
    titleLength: 35,
    metaDescription: 'Velvet Amber description',
    metaDescriptionLength: 24,
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
    wordCount: 350,
    textSnippet: 'Rich Cambodian oud, benzoin, and warm amber resin.',
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
    domElementCount: 40,
    ...overrides,
  };
}

describe('Advanced Analyzers: Quality, Typos, Facets, Parity', () => {
  it('detects low-quality alt text (filename, UUID, single char, generic)', () => {
    const page = mockPage({
      images: [
        { src: '/uploads/30ml.jpg', alt: '30ml.jpg', hasAlt: true, isLazy: false, hasExplicitDimensions: true },
        { src: '/uploads/uuid.png', alt: '88CA3330-79D1-46CC-A5B3-0594990D3D50', hasAlt: true, isLazy: false, hasExplicitDimensions: true },
        { src: '/uploads/thumb.jpg', alt: '2', hasAlt: true, isLazy: false, hasExplicitDimensions: true },
        { src: '/uploads/banner.jpg', alt: 'image', hasAlt: true, isLazy: false, hasExplicitDimensions: true },
      ],
    });

    const findings = analyzeImageAltQuality([page]);
    expect(findings.some((f) => f.id.includes('ONPAGE-IMAGE-ALT-QUALITY'))).toBe(true);
    const finding = findings.find((f) => f.id.includes('ONPAGE-IMAGE-ALT-QUALITY'))!;
    expect(finding.evidence).toContain('30ml.jpg');
    expect(finding.evidence).toContain('88CA3330-79D1-46CC-A5B3-0594990D3D50');
  });

  it('detects site-wide navigation typos (e.g. "Car Freshners")', () => {
    const page1 = mockPage({
      url: 'https://www.kingshyer.com/',
      internalLinks: [{ url: 'https://www.kingshyer.com/shop/car-fresheners', anchorText: 'Car Freshners' }],
    });
    const page2 = mockPage({
      url: 'https://www.kingshyer.com/product/velvet-amber',
      internalLinks: [{ url: 'https://www.kingshyer.com/shop/car-fresheners', anchorText: 'Car Freshners' }],
    });

    const findings = analyzeTextQualityAndTypos([page1, page2]);
    const navTypo = findings.find((f) => f.id.includes('CONTENT-NAV-TYPO-freshners'));
    expect(navTypo).toBeDefined();
    expect(navTypo?.severity).toBe('high');
    expect(navTypo?.evidence).toContain('fresheners');
  });

  it('detects metadata fallback where product page uses homepage default metadata', () => {
    const home = mockPage({
      url: 'https://www.kingshyer.com/',
      title: 'KingShyer — Luxury Alcohol-Free Perfume Oils, Australia',
      metaDescription: 'Discover pure attar and artisanal perfume oils crafted in small batches.',
    });
    const product = mockPage({
      url: 'https://www.kingshyer.com/product/midas-reserve',
      title: 'KingShyer — Luxury Alcohol-Free Perfume Oils, Australia',
      metaDescription: 'Discover pure attar and artisanal perfume oils crafted in small batches.',
    });

    const findings = analyzeFacetedAndFallbackUrls([home, product]);
    const fallbackFinding = findings.find((f) => f.id.includes('ONPAGE-METADATA-FALLBACK'));
    expect(fallbackFinding).toBeDefined();
    expect(fallbackFinding?.title).toContain('Likely metadata fallback');
  });

  it('detects faceted query parameter URL competing with clean parent URL', () => {
    const parent = mockPage({
      url: 'https://www.kingshyer.com/shop',
      title: 'Shop All Fragrances',
    });
    const faceted = mockPage({
      url: 'https://www.kingshyer.com/shop?sub=men',
      title: 'Shop All Fragrances',
      canonicalUrl: 'https://www.kingshyer.com/shop?sub=men', // self-canonical
    });

    const findings = analyzeFacetedAndFallbackUrls([parent, faceted]);
    const facetFinding = findings.find((f) => f.id.includes('INDEX-FACETED-URL-CONFLICT'));
    expect(facetFinding).toBeDefined();
    expect(facetFinding?.recommendedFix).toContain('https://www.kingshyer.com/shop');
  });

  it('detects templated near-duplicate content across product pages', () => {
    const sharedText =
      'Our signature perfume oils are crafted through meticulous botanical maceration in small batches in Canberra Australia. Each bottle contains high concentration botanical carrier lipids that bond gently with skin without stinging or causing redness. Store in a cool dark place away from direct sunlight.';

    const prod1 = mockPage({
      url: 'https://www.kingshyer.com/product/midas-reserve',
      h1s: ['Midas Reserve'],
      textSnippet: `Midas Reserve. ${sharedText}`,
    });
    const prod2 = mockPage({
      url: 'https://www.kingshyer.com/product/velvet-amber',
      h1s: ['Velvet Amber'],
      textSnippet: `Velvet Amber. ${sharedText}`,
    });

    const findings = analyzeContentSimilarity([prod1, prod2]);
    expect(findings.some((f) => f.id.includes('CONTENT-NEAR-DUPLICATE'))).toBe(true);
  });

  it('detects ambiguous weak links with identical text pointing to different destinations', () => {
    const page = mockPage({
      internalLinks: [
        { url: 'https://www.kingshyer.com/shop/car-fresheners-men', anchorText: 'Men' },
        { url: 'https://www.kingshyer.com/shop/scented-oils-men', anchorText: 'Men' },
      ],
    });

    const findings = analyzeWeakAndAmbiguousLinks([page]);
    const weakLink = findings.find((f) => f.id.includes('LINKS-AMBIGUOUS-ANCHOR'));
    expect(weakLink).toBeDefined();
    expect(weakLink?.evidence).toContain('car-fresheners-men');
    expect(weakLink?.evidence).toContain('scented-oils-men');
  });

  it('detects FAQPage schema with questions missing from visible DOM', () => {
    const page = mockPage({
      textSnippet: 'General product description without any questions.',
      structuredData: [
        {
          type: 'FAQPage',
          rawJson: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How long does this perfume oil last on skin?',
                acceptedAnswer: { '@type': 'Answer', text: '12-14 hours.' },
              },
            ],
          }),
          isValid: true,
          errors: [],
          warnings: [],
          propertiesFound: ['@context', '@type', 'mainEntity'],
        },
      ],
    });

    const findings = analyzeSchemaDomParity([page]);
    const parityFinding = findings.find((f) => f.id.includes('SCHEMA-FAQ-DOM-MISMATCH'));
    expect(parityFinding).toBeDefined();
    expect(parityFinding?.evidence).toContain('How long does this perfume oil last on skin?');
  });

  it('detects OG type mismatch on product page and missing image dimensions', () => {
    const page = mockPage({
      url: 'https://www.kingshyer.com/product/velvet-amber',
      ogType: 'article', // Should be product!
      ogImage: 'https://www.kingshyer.com/uploads/card.jpg',
    });

    const findings = analyzeSocialMetadata([page]);
    expect(findings.some((f) => f.id.includes('SOCIAL-OG-TYPE-MISMATCH'))).toBe(true);
    expect(findings.some((f) => f.id.includes('SOCIAL-OG-IMAGE-DIMENSIONS-MISSING'))).toBe(true);
  });
});
