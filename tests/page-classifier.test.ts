import { describe, it, expect } from 'vitest';
import { classifyPageType } from '../src/lib/analyzer/page-classifier';
import { analyzeContentQuality } from '../src/lib/analyzer/content-quality';
import { calculateAuditScores, extractRuleFamily } from '../src/lib/analyzer/scoring';
import { ExtractedPageData, Finding } from '../src/types/audit';

function createMockPage(overrides: Partial<ExtractedPageData>): ExtractedPageData {
  return {
    url: 'https://example.com/test',
    normalizedUrl: 'https://example.com/test',
    statusCode: 200,
    isHtml: true,
    html: '',
    title: 'Test Page',
    metaDescription: '',
    h1s: ['Heading 1'],
    h2s: [],
    h3s: [],
    wordCount: 350,
    readingTimeMinutes: 1,
    canonicalUrl: null,
    robotsDirectives: [],
    images: [],
    internalLinks: [],
    externalLinks: [],
    structuredData: [],
    headings: [],
    textSnippet: '',
    ...overrides,
  } as any;
}

describe('Page Type Classification', () => {
  it('classifies home, product, collection, article, about, contact, and policy pages accurately', () => {
    expect(classifyPageType(createMockPage({ url: 'https://example.com/' }))).toBe('home');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/product/velvet-amber' }))).toBe('product');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/collections/perfume-oils' }))).toBe('collection');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/blog/how-to-apply-attar' }))).toBe('article');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/about-us' }))).toBe('about');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/contact' }))).toBe('contact');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/privacy-policy' }))).toBe('policy');
    expect(classifyPageType(createMockPage({ url: 'https://example.com/cart' }))).toBe('utility');
  });

  it('classifies collection by product link heuristic if URL is ambiguous', () => {
    const page = createMockPage({
      url: 'https://example.com/men',
      internalLinks: [
        { url: 'https://example.com/product/one', anchorText: 'One' },
        { url: 'https://example.com/product/two', anchorText: 'Two' },
        { url: 'https://example.com/product/three', anchorText: 'Three' },
        { url: 'https://example.com/product/four', anchorText: 'Four' },
      ],
    });
    expect(classifyPageType(page)).toBe('collection');
  });
});

describe('Content Depth Calibration by Page Type', () => {
  it('does NOT flag contact or policy pages for thin content', () => {
    const contactPage = createMockPage({
      url: 'https://example.com/contact',
      wordCount: 85,
      pageType: 'contact',
    });
    const policyPage = createMockPage({
      url: 'https://example.com/privacy-policy',
      wordCount: 120,
      pageType: 'policy',
    });

    const findings = analyzeContentQuality([contactPage, policyPage]);
    const thinFindings = findings.filter((f) => f.id.includes('CONTENT-THIN'));
    expect(thinFindings.length).toBe(0);
  });

  it('flags product pages with 240 words as moderate depth, not critical zero', () => {
    const productPage = createMockPage({
      url: 'https://example.com/product/velvet-amber',
      wordCount: 240,
      pageType: 'product',
    });

    const findings = analyzeContentQuality([productPage]);
    const moderateFinding = findings.find((f) => f.id.includes('CONTENT-DEPTH-PRODUCT-MODERATE'));
    const criticalThin = findings.find((f) => f.id.includes('CONTENT-THIN-PRODUCT-CRITICAL'));

    expect(moderateFinding).toBeDefined();
    expect(moderateFinding?.severity).toBe('medium');
    expect(criticalThin).toBeUndefined();
  });

  it('flags collection page with 40 words as brief collection intro (low), not blog thin content', () => {
    const collectionPage = createMockPage({
      url: 'https://example.com/collections/best-sellers',
      wordCount: 40,
      pageType: 'collection',
      internalLinks: [
        { url: 'https://example.com/product/a', anchorText: 'A' },
        { url: 'https://example.com/product/b', anchorText: 'B' },
        { url: 'https://example.com/product/c', anchorText: 'C' },
        { url: 'https://example.com/product/d', anchorText: 'D' },
      ],
    });

    const findings = analyzeContentQuality([collectionPage]);
    const collectionFinding = findings.find((f) => f.id.includes('CONTENT-COLLECTION-INTRO-BRIEF'));
    expect(collectionFinding).toBeDefined();
    expect(collectionFinding?.severity).toBe('low');
  });
});

describe('Scoring Recalibration & Caps', () => {
  it('extracts stable rule family from finding IDs', () => {
    expect(extractRuleFamily('CANONICAL-CONFLICT-APEX-WWW-https://kingshyer.com')).toBe('CANONICAL-CONFLICT-APEX-WWW');
    expect(extractRuleFamily('H1-MISSING-https://kingshyer.com/product/1')).toBe('H1-MISSING');
  });

  it('caps penalty for a single systemic issue so it does not zero out category score', () => {
    // Simulate 20 pages all missing H1 (high severity)
    const findings: Finding[] = [];
    for (let i = 1; i <= 20; i++) {
      findings.push({
        id: `H1-MISSING-https://example.com/page/${i}`,
        category: 'onpage',
        severity: 'high',
        title: 'Document contains zero h1 elements',
        evidence: 'No H1',
        affectedUrl: `https://example.com/page/${i}`,
        whyItMatters: 'Important',
        confidence: 'high',
        recommendedFix: 'Add H1',
        effort: 'quick_win',
        validationInstructions: 'Check H1',
      });
    }

    const result = calculateAuditScores(findings, 20);
    const onpageScore = result.categoryScores.find((c) => c.category === 'onpage');

    // Rule cap for high severity is 25, so score should be 100 - 25 = 75, not 0!
    expect(onpageScore?.score).toBe(75);
  });

  it('reports score 0, incomplete status, and low confidence when no pages crawled', () => {
    const result = calculateAuditScores([], 0, true);
    expect(result.overallScore).toBe(0);
    expect(result.confidence).toBe('low');
    expect(result.categoryScores[0].status).toBe('incomplete');
  });

  it('guarantees sum of category findings counts strictly equals total findings', () => {
    const mockFindings: Finding[] = [
      { id: 'T-1', category: 'technical', severity: 'critical', title: '', evidence: '', affectedUrl: '', whyItMatters: '', confidence: 'high', recommendedFix: '', effort: 'quick_win', validationInstructions: '' },
      { id: 'O-1', category: 'onpage', severity: 'high', title: '', evidence: '', affectedUrl: '', whyItMatters: '', confidence: 'high', recommendedFix: '', effort: 'quick_win', validationInstructions: '' },
      { id: 'C-1', category: 'content', severity: 'medium', title: '', evidence: '', affectedUrl: '', whyItMatters: '', confidence: 'high', recommendedFix: '', effort: 'quick_win', validationInstructions: '' },
      { id: 'S-1', category: 'structured_data', severity: 'low', title: '', evidence: '', affectedUrl: '', whyItMatters: '', confidence: 'high', recommendedFix: '', effort: 'quick_win', validationInstructions: '' },
      { id: 'A-1', category: 'aeo', severity: 'medium', title: '', evidence: '', affectedUrl: '', whyItMatters: '', confidence: 'high', recommendedFix: '', effort: 'quick_win', validationInstructions: '' },
      { id: 'G-1', category: 'geo', severity: 'low', title: '', evidence: '', affectedUrl: '', whyItMatters: '', confidence: 'high', recommendedFix: '', effort: 'quick_win', validationInstructions: '' },
    ];

    const result = calculateAuditScores(mockFindings, 5);
    const sumCount = result.categoryScores.reduce((sum, cat) => {
      return sum + cat.findingsCount.critical + cat.findingsCount.high + cat.findingsCount.medium + cat.findingsCount.low + cat.findingsCount.informational;
    }, 0);

    expect(sumCount).toBe(mockFindings.length);
  });
});
