import { ExtractedPageData, Finding, Severity, Category, StructuredDataItem } from '../../src/types/audit';

export interface CalibrationFixture {
  id: string;
  name: string;
  description: string;
  pages: ExtractedPageData[];
  findings: Finding[];
  expectedOverallMin: number;
  expectedOverallMax: number;
  expectedCategoryBands?: Partial<Record<Category, { min: number; max: number }>>;
}

function makeSchema(type: string, rawJson = '{}'): StructuredDataItem {
  return {
    type,
    rawJson,
    isValid: true,
    errors: [],
    warnings: [],
    propertiesFound: ['name', 'description'],
  };
}

function makePage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://example.com/',
    normalizedUrl: 'https://example.com/',
    statusCode: 200,
    statusText: 'OK',
    fetchDurationMs: 150,
    contentType: 'text/html; charset=utf-8',
    contentLengthBytes: 25000,
    isHtml: true,
    title: 'Example Page Title With Good Length',
    titleLength: 35,
    metaDescription: 'This is a well-crafted meta description within the recommended 120-160 character window.',
    metaDescriptionLength: 88,
    canonicalUrl: 'https://example.com/',
    robotsDirectives: ['index', 'follow'],
    h1s: ['Primary Heading'],
    h2s: ['Secondary Heading A', 'Secondary Heading B'],
    h3s: ['Tertiary Heading'],
    headingHierarchyValid: true,
    headingIssues: [],
    internalLinks: [{ url: 'https://example.com/about', anchorText: 'About Us' }],
    externalLinks: [],
    brokenInternalLinks: [],
    images: [
      {
        src: 'https://example.com/hero.jpg',
        alt: 'Hero presentation image',
        hasAlt: true,
        isLazy: false,
        hasExplicitDimensions: true,
      },
    ],
    wordCount: 850,
    textSnippet: 'Extensive descriptive body copy providing factual answers...',
    detectedEntities: ['ExampleCorp'],
    hasFAQMarkupOrContent: true,
    hasDirectDefinitions: true,
    hasTablesOrLists: true,
    hasAuthorAttribution: true,
    hasContactOrAboutEvidence: true,
    structuredData: [makeSchema('Organization', '{"@context":"https://schema.org","@type":"Organization"}')],
    isHttps: true,
    hasCompression: true,
    renderBlockingResourceCount: 0,
    domElementCount: 450,
    pageType: 'home',
    ...overrides,
  };
}

function makeFinding(
  id: string,
  category: Category,
  severity: Severity,
  title: string,
  affectedUrls: string[] = ['https://example.com/']
): Finding {
  return {
    id,
    category,
    severity,
    title,
    description: `Finding description for ${id}`,
    evidence: 'Observed automated evidence',
    affectedUrl: affectedUrls[0] || 'https://example.com/',
    affectedUrls,
    whyItMatters: 'Finding impact on search visibility',
    confidence: 'high',
    recommendedFix: 'Actionable recommended fix',
    effort: 'quick_win',
    validationInstructions: 'Verify in browser DOM or network inspector',
  };
}

export const CALIBRATION_FIXTURES: CalibrationFixture[] = [
  // 1. Well-Optimized Modern Site (Next.js Marketing)
  {
    id: 'well-optimized-nextjs',
    name: 'Well-Optimized Modern Site (Next.js)',
    description: 'Blazing fast TTFB, perfect semantic hierarchy, Organization and WebSite schema, llms.txt.',
    pages: [
      makePage({ url: 'https://example.com/', title: 'Next.js App — Leading High Performance Solution', wordCount: 950 }),
      makePage({ url: 'https://example.com/pricing', title: 'Transparent Pricing Plans — Next.js App', wordCount: 720, pageType: 'product' }),
      makePage({ url: 'https://example.com/about', title: 'About Our Engineering Team — Next.js App', wordCount: 810, pageType: 'about' }),
    ],
    findings: [],
    expectedOverallMin: 90,
    expectedOverallMax: 100,
    expectedCategoryBands: {
      technical: { min: 90, max: 100 },
      onpage: { min: 90, max: 100 },
      structured_data: { min: 85, max: 100 },
    },
  },

  // 2. Average Ecommerce Site (Shopify)
  {
    id: 'average-ecommerce-shopify',
    name: 'Average Ecommerce Store (Shopify)',
    description: 'Decent product catalog, missing alt tags on product photos, thin product copy, missing AEO definition blocks, missing llms.txt.',
    pages: [
      makePage({ url: 'https://shop.example.com/', pageType: 'home' }),
      makePage({
        url: 'https://shop.example.com/products/item-1',
        pageType: 'product',
        wordCount: 120,
        images: [{ src: 'https://shop.example.com/p1.jpg', alt: '', hasAlt: false, isLazy: false, hasExplicitDimensions: false }],
        structuredData: [],
      }),
      makePage({
        url: 'https://shop.example.com/products/item-2',
        pageType: 'product',
        wordCount: 140,
        images: [{ src: 'https://shop.example.com/p2.jpg', alt: '', hasAlt: false, isLazy: false, hasExplicitDimensions: false }],
        structuredData: [],
      }),
    ],
    findings: [
      makeFinding('IMAGE_ALT_MISSING', 'onpage', 'medium', 'Missing image alt text', [
        'https://shop.example.com/products/item-1',
        'https://shop.example.com/products/item-2',
      ]),
      makeFinding('CONTENT_WORD_COUNT_THIN', 'content', 'medium', 'Thin product description copy', [
        'https://shop.example.com/products/item-1',
        'https://shop.example.com/products/item-2',
      ]),
      makeFinding('STRUCTURED_DATA_MISSING', 'structured_data', 'medium', 'Missing Product Schema JSON-LD', [
        'https://shop.example.com/products/item-1',
        'https://shop.example.com/products/item-2',
      ]),
      makeFinding('AEO_DEFINITION_ABSENT', 'aeo', 'medium', 'Missing concise direct definition block', [
        'https://shop.example.com/products/item-1',
        'https://shop.example.com/products/item-2',
      ]),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt discoverability manifest', []),
    ],
    expectedOverallMin: 65,
    expectedOverallMax: 88,
  },

  // 3. Content Blog Site (WordPress)
  {
    id: 'content-blog-wordpress',
    name: 'Content & Editorial Blog (WordPress)',
    description: 'Text-heavy articles, Article schema, slightly long titles, good readability.',
    pages: [
      makePage({ url: 'https://blog.example.com/', pageType: 'home' }),
      makePage({ url: 'https://blog.example.com/article-1', pageType: 'article', wordCount: 1450 }),
      makePage({ url: 'https://blog.example.com/article-2', pageType: 'article', wordCount: 1200 }),
    ],
    findings: [
      makeFinding('ONPAGE_TITLE_LENGTH_LONG', 'onpage', 'low', 'Title tag exceeds 65 characters', [
        'https://blog.example.com/article-1',
      ]),
      makeFinding('PERF_SLOW_RESPONSE_TIME', 'performance', 'low', 'Server response TTFB > 750ms', [
        'https://blog.example.com/article-2',
      ]),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt', []),
    ],
    expectedOverallMin: 78,
    expectedOverallMax: 95,
  },

  // 4. JS-Heavy Client-Side SPA (React CSR, no SSR)
  {
    id: 'js-heavy-spa',
    name: 'JS-Heavy Client-Side SPA (CSR)',
    description: 'Empty initial HTML shell, client-hydrated titles, no initial H1 or schema in raw DOM, no static metadata.',
    pages: [
      makePage({
        url: 'https://spa.example.com/',
        wordCount: 45,
        h1s: [],
        structuredData: [],
        title: 'App',
        titleLength: 3,
        metaDescription: '',
      }),
      makePage({
        url: 'https://spa.example.com/dashboard',
        wordCount: 60,
        h1s: [],
        structuredData: [],
        title: 'Dashboard',
        titleLength: 9,
        metaDescription: '',
      }),
    ],
    findings: [
      makeFinding('ONPAGE_H1_MISSING', 'onpage', 'high', 'Document contains zero h1 headings in raw HTML', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
      makeFinding('ONPAGE_TITLE_SHORT', 'onpage', 'medium', 'Title tag too short', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
      makeFinding('ONPAGE_META_DESCRIPTION_MISSING', 'onpage', 'medium', 'Missing meta description tag', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
      makeFinding('CONTENT_WORD_COUNT_THIN', 'content', 'high', 'Extremely thin body copy in raw DOM', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
      makeFinding('STRUCTURED_DATA_MISSING', 'structured_data', 'high', 'No schema markup detected in static DOM', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
      makeFinding('AEO_DEFINITION_ABSENT', 'aeo', 'high', 'No direct definitions present', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt', []),
      makeFinding('GEO_ENTITY_MISSING', 'geo', 'medium', 'No grounded entity cues in static DOM', [
        'https://spa.example.com/',
        'https://spa.example.com/dashboard',
      ]),
    ],
    expectedOverallMin: 38,
    expectedOverallMax: 68,
  },

  // 5. Broken Site with Critical Severity Blocker
  {
    id: 'broken-site-critical',
    name: 'Broken Site with Critical Blocker',
    description: 'Site-wide noindex directive or critical server failure; must never score above 40.',
    pages: [
      makePage({ url: 'https://broken.example.com/', statusCode: 500, robotsDirectives: ['noindex', 'nofollow'] }),
      makePage({ url: 'https://broken.example.com/contact', statusCode: 404 }),
    ],
    findings: [
      makeFinding('TECH_CRITICAL_SITE_WIDE_NOINDEX', 'technical', 'critical', 'Critical: Site-wide noindex tag active across all pages', [
        'https://broken.example.com/',
        'https://broken.example.com/contact',
      ]),
      makeFinding('TECH_BROKEN_INTERNAL_LINK', 'technical', 'high', 'Dead 404 internal link', [
        'https://broken.example.com/contact',
      ]),
    ],
    expectedOverallMin: 15,
    expectedOverallMax: 40, // Enforced strictly by Severity Gate <= 40
  },

  // 6. Thin Affiliate Site
  {
    id: 'thin-affiliate-site',
    name: 'Thin Doorway Affiliate Site',
    description: 'Thin copy, missing editorial transparency, no structured data, generic anchor links, duplicate doorway patterns.',
    pages: [
      makePage({ url: 'https://affiliate.example.com/best-deals', wordCount: 95, hasAuthorAttribution: false, structuredData: [] }),
      makePage({ url: 'https://affiliate.example.com/top-rated', wordCount: 80, hasAuthorAttribution: false, structuredData: [] }),
    ],
    findings: [
      makeFinding('CONTENT_WORD_COUNT_THIN', 'content', 'high', 'Thin body content below 100 words', [
        'https://affiliate.example.com/best-deals',
        'https://affiliate.example.com/top-rated',
      ]),
      makeFinding('CONTENT_EAT_AUTHOR_MISSING', 'content', 'high', 'No author or editorial attribution', [
        'https://affiliate.example.com/best-deals',
        'https://affiliate.example.com/top-rated',
      ]),
      makeFinding('STRUCTURED_DATA_MISSING', 'structured_data', 'high', 'Missing Schema markup', [
        'https://affiliate.example.com/best-deals',
        'https://affiliate.example.com/top-rated',
      ]),
      makeFinding('GEO_AMBIGUOUS_ANCHOR', 'geo', 'high', 'Vague click here anchor links', [
        'https://affiliate.example.com/best-deals',
        'https://affiliate.example.com/top-rated',
      ]),
      makeFinding('AEO_DEFINITION_ABSENT', 'aeo', 'high', 'No direct answer definitions', [
        'https://affiliate.example.com/best-deals',
        'https://affiliate.example.com/top-rated',
      ]),
      makeFinding('ONPAGE_META_DESCRIPTION_MISSING', 'onpage', 'medium', 'Missing meta descriptions', [
        'https://affiliate.example.com/best-deals',
        'https://affiliate.example.com/top-rated',
      ]),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt', []),
    ],
    expectedOverallMin: 35,
    expectedOverallMax: 75,
  },

  // 7. Local Service Business
  {
    id: 'local-business-service',
    name: 'Local Service Business (Plumber / Dentist)',
    description: 'LocalBusiness schema, strong contact proof, decent headings, missing direct definition blocks.',
    pages: [
      makePage({ url: 'https://plumber.example.com/', wordCount: 650, structuredData: [makeSchema('LocalBusiness')] }),
      makePage({ url: 'https://plumber.example.com/services', wordCount: 520, pageType: 'collection' }),
    ],
    findings: [
      makeFinding('AEO_DEFINITION_ABSENT', 'aeo', 'medium', 'Missing direct definition block', ['https://plumber.example.com/']),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt discoverability', []),
    ],
    expectedOverallMin: 72,
    expectedOverallMax: 96,
  },

  // 8. B2B Enterprise SaaS
  {
    id: 'b2b-saas-enterprise',
    name: 'B2B Enterprise SaaS Platform',
    description: 'SoftwareApplication schema, FAQ blocks, high reading ease, strong security and speed.',
    pages: [
      makePage({ url: 'https://saas.example.com/', wordCount: 1100, structuredData: [makeSchema('SoftwareApplication'), makeSchema('FAQPage')] }),
      makePage({ url: 'https://saas.example.com/enterprise', wordCount: 890 }),
    ],
    findings: [
      makeFinding('ONPAGE_TITLE_LENGTH_LONG', 'onpage', 'low', 'Title slightly exceeds 65 chars', ['https://saas.example.com/enterprise']),
    ],
    expectedOverallMin: 85,
    expectedOverallMax: 98,
  },

  // 9. Digital News Publisher
  {
    id: 'news-publisher-media',
    name: 'Digital News Publisher',
    description: 'NewsArticle schema, high editorial transparency, heavy images causing TTFB delay.',
    pages: [
      makePage({ url: 'https://news.example.com/', wordCount: 1500, structuredData: [makeSchema('NewsArticle')] }),
      makePage({ url: 'https://news.example.com/world/article-1', wordCount: 950, fetchDurationMs: 950 }),
    ],
    findings: [
      makeFinding('PERF_SLOW_RESPONSE_TIME', 'performance', 'medium', 'Response time TTFB > 800ms', ['https://news.example.com/world/article-1']),
    ],
    expectedOverallMin: 75,
    expectedOverallMax: 99,
  },

  // 10. Educational / Academic Institution
  {
    id: 'government-educational',
    name: 'Educational / Government Site (.edu / .gov)',
    description: 'Highly accessible, text-heavy, but lacks modern Schema.org markup and social cards.',
    pages: [
      makePage({ url: 'https://edu.example.org/', wordCount: 1200, structuredData: [] }),
      makePage({ url: 'https://edu.example.org/admissions', wordCount: 1600, structuredData: [] }),
    ],
    findings: [
      makeFinding('STRUCTURED_DATA_MISSING', 'structured_data', 'medium', 'No schema markup detected', [
        'https://edu.example.org/',
        'https://edu.example.org/admissions',
      ]),
      makeFinding('ONPAGE_OG_MISSING', 'onpage', 'low', 'Missing og:image social tags', [
        'https://edu.example.org/',
      ]),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt', []),
    ],
    expectedOverallMin: 65,
    expectedOverallMax: 92,
  },

  // 11. Multilingual Global Enterprise
  {
    id: 'multilingual-international',
    name: 'Multilingual International Enterprise',
    description: 'hreflang tags, clean localized structure, solid schema, minor image alt omissions.',
    pages: [
      makePage({ url: 'https://global.example.com/en/', wordCount: 820 }),
      makePage({ url: 'https://global.example.com/fr/', wordCount: 830 }),
    ],
    findings: [
      makeFinding('IMAGE_ALT_MISSING', 'onpage', 'low', 'Missing image alt on header icon', ['https://global.example.com/fr/']),
    ],
    expectedOverallMin: 80,
    expectedOverallMax: 98,
  },

  // 12. Creative Agency Portfolio
  {
    id: 'portfolio-creative-agency',
    name: 'Creative Agency Visual Portfolio',
    description: 'Image heavy, minimal copy (<200 words), artistic non-standard headings, missing schema, missing alt text, missing definitions.',
    pages: [
      makePage({ url: 'https://agency.example.com/', wordCount: 140, structuredData: [] }),
      makePage({ url: 'https://agency.example.com/work', wordCount: 110, structuredData: [] }),
    ],
    findings: [
      makeFinding('CONTENT_WORD_COUNT_THIN', 'content', 'medium', 'Body copy below 200 words', [
        'https://agency.example.com/',
        'https://agency.example.com/work',
      ]),
      makeFinding('STRUCTURED_DATA_MISSING', 'structured_data', 'medium', 'No structured data', [
        'https://agency.example.com/',
        'https://agency.example.com/work',
      ]),
      makeFinding('IMAGE_ALT_MISSING', 'onpage', 'medium', 'Missing image alt text', [
        'https://agency.example.com/',
        'https://agency.example.com/work',
      ]),
      makeFinding('AEO_DEFINITION_ABSENT', 'aeo', 'medium', 'Missing definition blocks', [
        'https://agency.example.com/',
        'https://agency.example.com/work',
      ]),
      makeFinding('GEO_LLMS_TXT_MISSING', 'geo', 'low', 'Missing /llms.txt', []),
    ],
    expectedOverallMin: 50,
    expectedOverallMax: 82,
  },
];
