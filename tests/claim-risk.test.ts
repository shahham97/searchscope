import { describe, it, expect } from 'vitest';
import { analyzeContentClaimsAndRisks } from '../src/lib/analyzer/claim-risk-detector';
import { ExtractedPageData } from '../src/types/audit';

function createMockPage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://example.com/item',
    normalizedUrl: 'https://example.com/item',
    statusCode: 200,
    isHtml: true,
    html: '',
    title: 'Product Title',
    metaDescription: '',
    h1s: ['Product H1'],
    h2s: [],
    h3s: [],
    wordCount: 300,
    readingTimeMinutes: 1,
    fleschKincaidReadingEase: 70,
    canonicalUrl: null,
    robotsMeta: null,
    images: [],
    internalLinks: [],
    externalLinks: [],
    structuredData: [],
    openGraph: {},
    twitterCard: {},
    headings: [],
    textSnippet: '',
    extractedKeywords: [],
    timingMs: 50,
    ...overrides,
  };
}

describe('Compliance & Claim-Risk Detector', () => {
  it('detects country of origin and handcrafting claims', () => {
    const page = createMockPage({
      url: 'https://example.com/product/perfume',
      textSnippet: 'Our pure perfume oil is handcrafted in Canberra using traditional techniques.',
    });

    const result = analyzeContentClaimsAndRisks([page]);
    const originClaim = result.claims.find((c) => c.category === 'origin_making');
    expect(originClaim).toBeDefined();
    expect(originClaim?.riskLevel).toBe('high');
    expect(originClaim?.claimText.toLowerCase()).toContain('handcrafted in canberra');
  });

  it('detects 100% pure and organic ingredient claims', () => {
    const page = createMockPage({
      url: 'https://example.com/product/attar',
      textSnippet: 'Formulated with 100% pure perfume oil and botanical extracts.',
    });

    const result = analyzeContentClaimsAndRisks([page]);
    const ingredientClaim = result.claims.find((c) => c.category === 'ingredient_sourcing');
    expect(ingredientClaim).toBeDefined();
    expect(ingredientClaim?.claimText.toLowerCase()).toContain('100% pure');
  });

  it('detects longevity and performance claims', () => {
    const page = createMockPage({
      url: 'https://example.com/product/extrait',
      textSnippet: 'Extreme projection that lasts 14 hours on skin without reapplication.',
    });

    const result = analyzeContentClaimsAndRisks([page]);
    const perfClaim = result.claims.find((c) => c.category === 'performance_health');
    expect(perfClaim).toBeDefined();
    expect(perfClaim?.claimText.toLowerCase()).toContain('lasts 14 hours');
  });

  it('detects superlative and ranking claims', () => {
    const page = createMockPage({
      url: 'https://example.com/about',
      textSnippet: 'Recognized as the #1 in Australia for artisanal attars.',
    });

    const result = analyzeContentClaimsAndRisks([page]);
    const superClaim = result.claims.find((c) => c.category === 'superlative_comparative');
    expect(superClaim).toBeDefined();
    expect(superClaim?.claimText.toLowerCase()).toContain('#1 in australia');
  });

  it('detects trademark-adjacent fragrance references and issues advisory', () => {
    const page = createMockPage({
      url: 'https://example.com/product/inspired-scent',
      textSnippet: 'If you love Baccarat Rouge 540, our bespoke oil captures similar saffron amber notes.',
    });

    const result = analyzeContentClaimsAndRisks([page]);
    const tmClaim = result.claims.find((c) => c.category === 'trademark_adjacent');
    expect(tmClaim).toBeDefined();
    expect(tmClaim?.riskLevel).toBe('advisory');
  });

  it('includes review integrity baseline guidance', () => {
    const page = createMockPage({
      url: 'https://example.com',
      textSnippet: 'Welcome to our store.',
    });

    const result = analyzeContentClaimsAndRisks([page]);
    const reviewGuidance = result.findings.find((f) => f.id === 'COMPLIANCE-REVIEW-INTEGRITY-GUIDANCE');
    expect(reviewGuidance).toBeDefined();
    expect(reviewGuidance?.whyItMatters).toContain('independent purchasers');
  });
});
