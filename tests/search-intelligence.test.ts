import { describe, it, expect } from 'vitest';
import { extractCandidateKeywords, classifyIntent } from '../src/lib/analyzer/search-intelligence';
import { ExtractedPageData } from '../src/types/audit';

function createMockPage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://kingshyer.com/product/oud-royal',
    normalizedUrl: 'https://kingshyer.com/product/oud-royal',
    statusCode: 200,
    isHtml: true,
    html: '',
    title: 'Kingshyer Oud Royal — Luxury Alcohol-Free Perfume Oils',
    metaDescription: 'Shop artisanal oud perfume oils handcrafted in Australia.',
    h1s: ['Oud Royal Perfume Oil'],
    h2s: ['Scent Accords', 'Longevity & Application'],
    h3s: [],
    wordCount: 320,
    readingTimeMinutes: 1,
    canonicalUrl: null,
    robotsDirectives: [],
    images: [],
    internalLinks: [],
    externalLinks: [],
    structuredData: [],
    headings: [],
    textSnippet: 'Oud Royal is a pure perfume oil crafted with natural oud accords and rich amber.',
    extractedKeywords: [],
    ...overrides,
  } as any;
}

describe('Search Intelligence & Keyword Intent Engine', () => {
  it('extracts single domain keywords like "oud" alongside 2-gram and 3-grams', () => {
    const pages: ExtractedPageData[] = [
      createMockPage({ url: 'https://kingshyer.com/product/oud-royal' }),
      createMockPage({
        url: 'https://kingshyer.com/product/velvet-amber',
        title: 'Velvet Amber Perfume Oil',
        h1s: ['Velvet Amber'],
        textSnippet: 'Rich velvet amber blended with smoky oud notes.',
      }),
      createMockPage({
        url: 'https://kingshyer.com/product/kings-code',
        title: 'Kings Code Oud Extract',
        h1s: ['Kings Code'],
        textSnippet: 'A commanding scent featuring aged Cambodian oud.',
      }),
    ];

    const candidates = extractCandidateKeywords(pages);
    const keywords = candidates.map((c) => c.keyword);

    // Verify "oud" (1-gram) is retained and prominently ranked
    expect(keywords).toContain('oud');

    // Verify 2-gram and 3-gram extraction
    const hasMultiGram = keywords.some((k) => k.includes(' ') && (k.includes('perfume') || k.includes('oil')));
    expect(hasMultiGram).toBe(true);

    const oudCandidate = candidates.find((c) => c.keyword === 'oud');
    expect(oudCandidate).toBeDefined();
    expect(oudCandidate?.inTitlePagesCount).toBeGreaterThanOrEqual(2);
    expect(oudCandidate?.totalPagesCount).toBe(3);
    expect(oudCandidate?.pageFrequencyRatio).toContain('in title on');
  });

  it('correctly classifies intent according to specified heuristics', () => {
    const brandTokens = new Set(['kingshyer']);

    expect(classifyIntent('kingshyer sovereign', brandTokens)).toBe('navigational');
    expect(classifyIntent('buy perfume oil online', brandTokens)).toBe('transactional');
    expect(classifyIntent('best luxury attar review', brandTokens)).toBe('commercial');
    expect(classifyIntent('how to apply attar oil', brandTokens)).toBe('informational');
    expect(classifyIntent('sydney perfume delivery australia', brandTokens)).toBe('local');
  });
});
