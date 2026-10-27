import { describe, it, expect } from 'vitest';
import { analyzeLinkGraph } from '../src/lib/analyzer/link-graph';
import { analyzeIndexationHygiene } from '../src/lib/analyzer/indexation-hygiene';
import { analyzeMobileAndRenderingParity } from '../src/lib/analyzer/mobile-parity';
import {
  analyzeEcommerceAndInternational,
  computeSimHash64,
  hammingDistance,
} from '../src/lib/analyzer/ecommerce-international';
import { analyzePerformance } from '../src/lib/analyzer/performance';
import { ExtractedPageData, StructuredDataItem } from '../src/types/audit';

function createMockPage(partial: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://example.com/page',
    normalizedUrl: 'https://example.com/page',
    statusCode: 200,
    statusText: 'OK',
    fetchDurationMs: 120,
    contentType: 'text/html; charset=utf-8',
    contentLengthBytes: 15000,
    isHtml: true,
    title: 'Test Page',
    titleLength: 9,
    metaDescription: 'Test Description',
    metaDescriptionLength: 16,
    robotsDirectives: [],
    h1s: ['Page Title'],
    h2s: [],
    h3s: [],
    headingHierarchyValid: true,
    headingIssues: [],
    internalLinks: [],
    externalLinks: [],
    brokenInternalLinks: [],
    images: [],
    wordCount: 350,
    textSnippet: 'This is standard page body copy explaining features and services in detail.',
    detectedEntities: ['Example'],
    hasFAQMarkupOrContent: false,
    hasDirectDefinitions: false,
    hasTablesOrLists: false,
    hasAuthorAttribution: true,
    hasContactOrAboutEvidence: true,
    structuredData: [],
    isHttps: true,
    hasCompression: true,
    renderBlockingResourceCount: 1,
    domElementCount: 250,
    ...partial,
  };
}

describe('Part D: Link Graph & Page Authority', () => {
  it('computes PageRank, BFS click depths, and detects orphan pages', () => {
    const home = createMockPage({
      url: 'https://example.com/',
      normalizedUrl: 'https://example.com/',
      internalLinks: [
        { url: 'https://example.com/products', anchorText: 'Products' },
        { url: 'https://example.com/about', anchorText: 'About' },
      ],
    });

    const products = createMockPage({
      url: 'https://example.com/products',
      normalizedUrl: 'https://example.com/products',
      internalLinks: [
        { url: 'https://example.com/', anchorText: 'Home' },
        { url: 'https://example.com/products/item-1', anchorText: 'Item 1' },
      ],
    });

    const about = createMockPage({
      url: 'https://example.com/about',
      normalizedUrl: 'https://example.com/about',
      internalLinks: [{ url: 'https://example.com/', anchorText: 'Home' }],
    });

    const item1 = createMockPage({
      url: 'https://example.com/products/item-1',
      normalizedUrl: 'https://example.com/products/item-1',
      internalLinks: [{ url: 'https://example.com/products', anchorText: 'Back to products' }],
    });

    const orphan = createMockPage({
      url: 'https://example.com/hidden-promo',
      normalizedUrl: 'https://example.com/hidden-promo',
      internalLinks: [{ url: 'https://example.com/', anchorText: 'Home' }],
    });

    const pages = [home, products, about, item1, orphan];
    const report = analyzeLinkGraph(pages);

    expect(report.pageAuthorities.length).toBe(5);

    // Home should have highest PageRank or top tier
    const homeAuth = report.pageAuthorities.find((p) => p.normalizedUrl === 'https://example.com/');
    expect(homeAuth).toBeDefined();
    expect(homeAuth?.clickDepth).toBe(0);

    // Item 1 should have click depth 2
    const item1Auth = report.pageAuthorities.find((p) => p.normalizedUrl === 'https://example.com/products/item-1');
    expect(item1Auth?.clickDepth).toBe(2);

    // Orphan should be flagged
    expect(report.orphanUrls).toContain('https://example.com/hidden-promo');
    expect(report.findings.some((f) => f.id === 'LINK_ORPHAN_PAGES')).toBe(true);
  });

  it('detects broken internal links and internal redirect hops', () => {
    const sourcePage = createMockPage({
      url: 'https://example.com/blog',
      normalizedUrl: 'https://example.com/blog',
      internalLinks: [
        { url: 'https://example.com/missing-post', anchorText: 'Old post' },
        { url: 'https://example.com/moved-page', anchorText: 'Moved' },
      ],
    });

    const brokenTarget = createMockPage({
      url: 'https://example.com/missing-post',
      normalizedUrl: 'https://example.com/missing-post',
      statusCode: 404,
      statusText: 'Not Found',
    });

    const redirectTarget = createMockPage({
      url: 'https://example.com/moved-page',
      normalizedUrl: 'https://example.com/moved-page',
      redirectChain: ['https://example.com/new-page'],
    });

    const report = analyzeLinkGraph([sourcePage, brokenTarget, redirectTarget]);
    expect(report.brokenInternalLinks.length).toBe(1);
    expect(report.brokenInternalLinks[0].targetUrl).toBe('https://example.com/missing-post');
    expect(report.redirectLinks.length).toBe(1);
    expect(report.findings.some((f) => f.id === 'LINK_BROKEN_INTERNAL')).toBe(true);
  });
});

describe('Part D: Indexation Hygiene & Crawl Traps', () => {
  it('identifies non-200 URLs and redirected URLs in XML sitemaps', () => {
    const okPage = createMockPage({ url: 'https://example.com/ok', normalizedUrl: 'https://example.com/ok' });
    const deadPage = createMockPage({
      url: 'https://example.com/dead',
      normalizedUrl: 'https://example.com/dead',
      statusCode: 404,
    });
    const redirectedPage = createMockPage({
      url: 'https://example.com/old',
      normalizedUrl: 'https://example.com/old',
      redirectChain: ['https://example.com/new'],
    });

    const sitemap = [
      'https://example.com/ok',
      'https://example.com/dead',
      'https://example.com/old',
    ];

    const report = analyzeIndexationHygiene([okPage, deadPage, redirectedPage], sitemap);
    expect(report.non200UrlsInSitemap.length).toBe(1);
    expect(report.non200UrlsInSitemap[0].url).toBe('https://example.com/dead');
    expect(report.redirectedUrlsInSitemap.length).toBe(1);
    expect(report.findings.some((f) => f.id === 'SITEMAP_NON_200_URLS')).toBe(true);
    expect(report.findings.some((f) => f.id === 'SITEMAP_REDIRECTED_URLS')).toBe(true);
  });

  it('detects faceted navigation crawl traps lacking clean canonicals', () => {
    const trappedPage = createMockPage({
      url: 'https://example.com/shoes?sort=price_asc&filter=red&size=10',
      normalizedUrl: 'https://example.com/shoes?sort=price_asc&filter=red&size=10',
      canonicalUrl: 'https://example.com/shoes?sort=price_asc&filter=red&size=10', // Points to faceted self
    });

    const cleanPage = createMockPage({
      url: 'https://example.com/shoes?sort=popular',
      normalizedUrl: 'https://example.com/shoes?sort=popular',
      canonicalUrl: 'https://example.com/shoes', // Clean canonical
    });

    const report = analyzeIndexationHygiene([trappedPage, cleanPage]);
    expect(report.facetedCrawlTraps).toContain(trappedPage.url);
    expect(report.facetedCrawlTraps).not.toContain(cleanPage.url);
    expect(report.findings.some((f) => f.id === 'FACETED_NAVIGATION_CRAWL_TRAP')).toBe(true);
  });
});

describe('Part D: Mobile Parity & Viewport Analysis', () => {
  it('flags missing viewport and user-scalable=no', () => {
    const missingVp = createMockPage({
      url: 'https://example.com/no-viewport',
      viewport: undefined,
    });

    const disabledZoom = createMockPage({
      url: 'https://example.com/zoom-blocked',
      viewport: 'width=device-width, initial-scale=1, user-scalable=no',
    });

    const validVp = createMockPage({
      url: 'https://example.com/valid',
      viewport: 'width=device-width, initial-scale=1',
    });

    const report = analyzeMobileAndRenderingParity([missingVp, disabledZoom, validVp]);
    expect(report.viewportIssues).toContain(missingVp.url);
    expect(report.findings.some((f) => f.id === 'MOBILE_VIEWPORT_MISSING')).toBe(true);
    expect(report.findings.some((f) => f.id.startsWith('MOBILE_USER_SCALABLE_DISABLED'))).toBe(true);
  });

  it('detects H1 only present after JavaScript execution', () => {
    const jsOnlyH1Page = createMockPage({
      url: 'https://example.com/spa-product',
      isJsRendered: true,
      isH1OnlyInJs: true,
      rawH1s: [],
      renderedH1s: ['Hydrated Product Heading'],
    });

    const report = analyzeMobileAndRenderingParity([jsOnlyH1Page]);
    expect(report.findings.some((f) => f.id.startsWith('PARITY_H1_JS_ONLY'))).toBe(true);
  });
});

describe('Part D: E-Commerce & International Analysis', () => {
  it('validates Google Merchant Center Product schema attributes', () => {
    const validProductSchema: StructuredDataItem = {
      type: 'Product',
      rawJson: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Luxury Velvet Scent',
        image: 'https://example.com/scent.jpg',
        offers: {
          '@type': 'Offer',
          price: '89.00',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        brand: {
          '@type': 'Brand',
          name: 'KingShyer',
        },
      }),
      isValid: true,
      errors: [],
      warnings: [],
      propertiesFound: ['name', 'image', 'offers', 'brand'],
    };

    const incompleteProductSchema: StructuredDataItem = {
      type: 'Product',
      rawJson: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Missing Offer Product',
        // Missing image, offers, brand
      }),
      isValid: true,
      errors: [],
      warnings: [],
      propertiesFound: ['name'],
    };

    const goodPage = createMockPage({
      url: 'https://example.com/product/good',
      pageType: 'product',
      structuredData: [validProductSchema],
    });

    const badPage = createMockPage({
      url: 'https://example.com/product/bad',
      pageType: 'product',
      structuredData: [incompleteProductSchema],
    });

    const noSchemaProduct = createMockPage({
      url: 'https://example.com/product/none',
      pageType: 'product',
      structuredData: [],
    });

    const report = analyzeEcommerceAndInternational([goodPage, badPage, noSchemaProduct]);
    expect(report.gmcIssuesCount).toBeGreaterThanOrEqual(2);
    expect(report.findings.some((f) => f.id.startsWith('GMC_MISSING_PRODUCT_SCHEMA'))).toBe(true);
    expect(report.findings.some((f) => f.id.startsWith('GMC_INCOMPLETE_PRODUCT_SCHEMA'))).toBe(true);
  });

  it('validates hreflang self-reference and ISO 639-1 language codes', () => {
    const invalidLangPage = createMockPage({
      url: 'https://example.com/fr-page',
      hreflangTargets: [
        { lang: 'xx-invalid', href: 'https://example.com/xx-page' },
        { lang: 'fr', href: 'https://example.com/fr-page' }, // self-ref present
      ],
    });

    const missingSelfRefPage = createMockPage({
      url: 'https://example.com/en-page',
      hreflangTargets: [
        { lang: 'es', href: 'https://example.com/es-page' }, // no self-ref to en-page
      ],
    });

    const report = analyzeEcommerceAndInternational([invalidLangPage, missingSelfRefPage]);
    expect(report.findings.some((f) => f.id.startsWith('HREFLANG_INVALID_LANG_CODE'))).toBe(true);
    expect(report.findings.some((f) => f.id.startsWith('HREFLANG_MISSING_SELF_REFERENCE'))).toBe(true);
  });

  it('clusters near-duplicate documents using 64-bit SimHash (Hamming distance <= 7 / >= 85% overlap)', () => {
    const textA = 'KingShyer artisan perfumes are hand-crafted in Canberra using sustainable pure ingredients and natural botanicals for exceptional sillage and longevity.';
    const textB = 'KingShyer artisan perfumes are hand-crafted in Canberra using sustainable pure ingredients and natural botanicals for exceptional sillage and long lasting scent.';
    const textC = 'Completely distinct article on web server optimization, database indexing, latency reduction, and CDN reverse proxy configuration.';

    const hashA = computeSimHash64(textA);
    const hashB = computeSimHash64(textB);
    const hashC = computeSimHash64(textC);

    const distAB = hammingDistance(hashA, hashB);
    const distAC = hammingDistance(hashA, hashC);

    expect(distAB).toBeLessThanOrEqual(7);
    expect(distAC).toBeGreaterThan(15);

    const pageA = createMockPage({
      url: 'https://example.com/perfume-a',
      textSnippet: textA,
      wordCount: 120,
    });
    const pageB = createMockPage({
      url: 'https://example.com/perfume-b',
      textSnippet: textB,
      wordCount: 120,
    });
    const pageC = createMockPage({
      url: 'https://example.com/tech-article',
      textSnippet: textC,
      wordCount: 120,
    });

    const report = analyzeEcommerceAndInternational([pageA, pageB, pageC]);
    expect(report.nearDuplicateClusters.length).toBe(1);
    expect(report.findings.some((f) => f.id.startsWith('CONTENT_NEAR_DUPLICATE'))).toBe(true);
  });
});

describe('Part D: Performance & Truth in Metrics', () => {
  it('evaluates synthetic crawler fetch time, compression, and DOM size without fabricating field CWV', () => {
    const slowPage = createMockPage({
      url: 'https://example.com/slow',
      fetchDurationMs: 1450,
      contentLengthBytes: 300000,
      hasCompression: false,
      domElementCount: 2200,
      renderBlockingResourceCount: 8,
    });

    const fastPage = createMockPage({
      url: 'https://example.com/fast',
      fetchDurationMs: 120,
      contentLengthBytes: 18000,
      hasCompression: true,
      domElementCount: 350,
      renderBlockingResourceCount: 1,
    });

    const report = analyzePerformance([slowPage, fastPage]);

    expect(report.summary.crawlerAverageFetchMs).toBeGreaterThan(500);
    expect(report.summary.isFieldDataAvailable).toBe(false);
    expect(report.summary.fieldDataNotice).toContain('SearchScope does not manufacture fake field CWV scores');

    expect(report.findings.some((f) => f.id === 'PERF_SLOW_SERVER_RESPONSE')).toBe(true);
    expect(report.findings.some((f) => f.id === 'PERF_NO_COMPRESSION')).toBe(true);
    expect(report.findings.some((f) => f.id === 'PERF_EXCESSIVE_HTML_PAYLOAD')).toBe(true);
    expect(report.findings.some((f) => f.id === 'PERF_EXCESSIVE_DOM_SIZE')).toBe(true);
    expect(report.findings.some((f) => f.id === 'PERF_RENDER_BLOCKING_RESOURCES')).toBe(true);
  });
});
