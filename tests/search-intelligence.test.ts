import { describe, it, expect } from 'vitest';
import {
  extractCandidateKeywords,
  classifyIntent,
  classifyIntentMultiSignal,
  buildKeywordMap,
  detectKeywordCannibalization,
} from '../src/lib/analyzer/search-intelligence';
import { ExtractedPageData } from '../src/types/audit';

function createMockPage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://kingshyer.com/product/oud-royal',
    normalizedUrl: 'https://kingshyer.com/product/oud-royal',
    statusCode: 200,
    isHtml: true,
    title: 'Kingshyer Oud Royal — Luxury Alcohol-Free Perfume Oils',
    metaDescription: 'Shop artisanal oud perfume oils handcrafted in Australia.',
    h1s: ['Oud Royal Perfume Oil'],
    h2s: ['Scent Accords', 'Longevity & Application'],
    h3s: [],
    wordCount: 320,
    canonicalUrl: 'https://kingshyer.com/product/oud-royal',
    robotsDirectives: [],
    images: [],
    internalLinks: [],
    externalLinks: [],
    structuredData: [{ type: 'Product', rawJson: '{}', isValid: true, errors: [], warnings: [], propertiesFound: [] }],
    textSnippet: 'Oud Royal is a pure perfume oil crafted with natural oud accords and rich amber.',
    detectedEntities: ['oud royal'],
    ...overrides,
  } as any;
}

describe('Part C: Search Intelligence & Phrase-First Keywords', () => {
  const pages: ExtractedPageData[] = [
    createMockPage({
      url: 'https://kingshyer.com/',
      title: 'Kingshyer — Luxury Alcohol-Free Perfume Oils Australia',
      h1s: ['Alcohol-Free Perfume Oils'],
      textSnippet: 'Discover our luxury perfume oil collection handcrafted in Australia.',
      pageType: 'home',
    }),
    createMockPage({
      url: 'https://kingshyer.com/product/oud-royal',
      title: 'Oud Royal Perfume Oil — Kingshyer',
      h1s: ['Oud Royal Perfume Oil'],
      textSnippet: 'Oud Royal is an alcohol-free pure perfume oil with amber accords.',
      pageType: 'product',
    }),
    createMockPage({
      url: 'https://kingshyer.com/product/velvet-amber',
      title: 'Velvet Amber Perfume Oil — Kingshyer',
      h1s: ['Velvet Amber Perfume Oil'],
      textSnippet: 'Rich velvet amber blended with smoky oud notes and floral accords.',
      pageType: 'product',
    }),
    createMockPage({
      url: 'https://kingshyer.com/product/kings-code',
      title: 'Kings Code Luxury Perfume Oil',
      h1s: ['Kings Code Perfume Oil'],
      textSnippet: 'A commanding perfume oil featuring aged Cambodian oud notes.',
      pageType: 'product',
    }),
    createMockPage({
      url: 'https://kingshyer.com/collections/perfume-oils',
      title: 'Best Perfume Oils Collection — Kingshyer',
      h1s: ['Luxury Perfume Oils Collection'],
      textSnippet: 'Compare the best perfume oils in Australia with free shipping.',
      pageType: 'collection',
    }),
  ];

  it('ranks multi-word phrases (2–5-grams) above unigrams and avoids stopword-only phrases', () => {
    const candidates = extractCandidateKeywords(pages);
    expect(candidates.length).toBeGreaterThan(0);

    // Verify top candidates are phrases (length >= 2)
    const top5 = candidates.slice(0, 5);
    const phraseCount = top5.filter((c) => c.gramLength && c.gramLength >= 2).length;
    expect(phraseCount).toBeGreaterThanOrEqual(4);

    // Verify zero stopword-only phrases exist
    for (const c of candidates) {
      const words = c.keyword.split(' ');
      expect(words[0]).not.toBe('of');
      expect(words[0]).not.toBe('the');
      expect(words[words.length - 1]).not.toBe('and');
      expect(c.keyword).not.toBe('click here');
      expect(c.keyword).not.toBe('read more');
    }
  });

  it('classifies search intent with multi-signal confidence and reasoning', () => {
    const transResult = classifyIntentMultiSignal('buy perfume oil online', pages);
    expect(transResult.intent).toBe('transactional');
    expect(transResult.confidence).toBe('high');
    expect(transResult.reasoning).toContain('transaction');

    const infoResult = classifyIntentMultiSignal('how to apply perfume oils', pages);
    expect(infoResult.intent).toBe('informational');
    expect(infoResult.reasoning).toContain('educational');

    const commResult = classifyIntentMultiSignal('best perfume oils review', pages);
    expect(commResult.intent).toBe('commercial');
    expect(commResult.reasoning).toContain('evaluation');
  });

  it('builds a structured Keyword Map with head terms, modifiers, and gap candidates', () => {
    const candidates = extractCandidateKeywords(pages);
    const map = buildKeywordMap(candidates, pages);

    expect(map.headTerms.length).toBeGreaterThan(0);
    expect(map.allModifiers.length).toBeGreaterThan(0);

    const firstHead = map.headTerms[0];
    expect(firstHead.headTerm).toBeDefined();
    expect(firstHead.modifiers.length).toBeGreaterThan(0);

    // Verify suggested gaps exist
    const hasGaps = map.headTerms.some((h) =>
      h.modifiers.some((m) => m.suggestedGaps.length > 0)
    );
    expect(hasGaps).toBe(true);
  });

  it('detects keyword cannibalization when multiple distinct pages optimize for the same primary phrase in Title/H1', () => {
    // Two pages both targeting "perfume oils collection" in their title/h1
    const cannibalPages: ExtractedPageData[] = [
      createMockPage({
        url: 'https://example.com/shop/perfume-oils',
        title: 'Luxury Perfume Oils Collection — Official Store',
        h1s: ['Perfume Oils Collection'],
        wordCount: 650,
      }),
      createMockPage({
        url: 'https://example.com/collections/best-perfume-oils',
        title: 'Perfume Oils Collection — Best Sellers',
        h1s: ['Perfume Oils Collection'],
        wordCount: 220,
      }),
    ];

    const candidates = extractCandidateKeywords(cannibalPages);
    const { issues, findings } = detectKeywordCannibalization(cannibalPages, candidates);

    expect(issues.length).toBeGreaterThan(0);
    const issue = issues[0];
    expect(issue.primaryUrl).toBe('https://example.com/shop/perfume-oils');
    expect(issue.competingUrls).toContain('https://example.com/collections/best-perfume-oils');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].category).toBe('onpage');
  });

  it('honestly marks search volume as "unavailable" when external APIs are disconnected', () => {
    const candidates = extractCandidateKeywords(pages);
    for (const c of candidates) {
      expect(c.searchVolume).toBe('unavailable');
      expect(c.searchDemandSource).toBe('unavailable');
    }
  });
});
