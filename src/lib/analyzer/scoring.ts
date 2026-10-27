import { Category, CategoryScore, Finding, Severity, ExtractedPageData } from '../../types/audit';

export interface CategoryDefinition {
  category: Category;
  label: string;
  weight: number;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { category: 'technical', label: 'Technical SEO', weight: 0.25 },
  { category: 'onpage', label: 'On-Page SEO', weight: 0.20 },
  { category: 'content', label: 'Content Quality', weight: 0.15 },
  { category: 'structured_data', label: 'Structured Data', weight: 0.15 },
  { category: 'aeo', label: 'AEO Readiness', weight: 0.10 },
  { category: 'geo', label: 'GEO Readiness', weight: 0.10 },
  { category: 'performance', label: 'Technical Performance', weight: 0.05 },
];

export interface CheckFamily {
  id: string;
  category: Category;
  label: string;
  weight: number;
  isSiteWide?: boolean;
  ruleMatcher: (findingId: string) => boolean;
}

/**
 * Principled check families with correlated check grouping.
 * Related issues (e.g. Missing Title, Title Too Short, Title Duplicate)
 * belong to the same family so that a page never deducts multiple times for correlated flaws.
 */
export const CHECK_FAMILIES: CheckFamily[] = [
  // 1. Technical SEO
  {
    id: 'tech-site-health',
    category: 'technical',
    label: 'Site Accessibility & Robots/Sitemap Directives',
    weight: 5,
    isSiteWide: true,
    ruleMatcher: (id) =>
      id.includes('ROBOTS') ||
      id.includes('SITEMAP') ||
      id.includes('DNS') ||
      id.includes('CONNECTION') ||
      id.includes('CRITICAL_SITE'),
  },
  {
    id: 'tech-canonical',
    category: 'technical',
    label: 'Canonical Link Integrity',
    weight: 5,
    ruleMatcher: (id) => id.includes('CANONICAL'),
  },
  {
    id: 'tech-https-tls',
    category: 'technical',
    label: 'HTTPS & Protocol Security',
    weight: 4,
    ruleMatcher: (id) => id.includes('HTTPS') || id.includes('MIXED_CONTENT') || id.includes('TLS'),
  },
  {
    id: 'tech-indexation',
    category: 'technical',
    label: 'Indexation & Crawl Directives',
    weight: 4,
    ruleMatcher: (id) => id.includes('INDEX') || id.includes('NOINDEX') || id.includes('DIRECTIVE'),
  },
  {
    id: 'tech-links-status',
    category: 'technical',
    label: 'Status Code & Broken Internal Links',
    weight: 4,
    ruleMatcher: (id) => id.includes('BROKEN') || id.includes('STATUS_') || id.includes('HTTP_ERROR'),
  },
  {
    id: 'tech-mobile-viewport',
    category: 'technical',
    label: 'Mobile Viewport & Responsiveness',
    weight: 3,
    ruleMatcher: (id) => id.includes('VIEWPORT') || id.includes('MOBILE'),
  },

  // 2. On-Page SEO
  {
    id: 'onpage-title',
    category: 'onpage',
    label: 'Title Tag Quality & Length',
    weight: 5,
    ruleMatcher: (id) => id.includes('TITLE') && !id.includes('OG_'),
  },
  {
    id: 'onpage-meta-description',
    category: 'onpage',
    label: 'Meta Description Presence & Length',
    weight: 3,
    ruleMatcher: (id) => id.includes('DESCRIPTION') && !id.includes('OG_'),
  },
  {
    id: 'onpage-headings',
    category: 'onpage',
    label: 'Semantic Heading Hierarchy (H1/H2/H3)',
    weight: 4,
    ruleMatcher: (id) => id.includes('H1') || id.includes('HEADING'),
  },
  {
    id: 'onpage-images',
    category: 'onpage',
    label: 'Image Alt Text & Asset Optimization',
    weight: 3,
    ruleMatcher: (id) => id.includes('IMAGE') || id.includes('ALT_'),
  },
  {
    id: 'onpage-social-meta',
    category: 'onpage',
    label: 'OpenGraph & Social Cards',
    weight: 2,
    ruleMatcher: (id) => id.includes('OG_') || id.includes('TWITTER_'),
  },

  // 3. Content Quality
  {
    id: 'content-depth',
    category: 'content',
    label: 'Content Substantiveness & Word Count',
    weight: 5,
    ruleMatcher: (id) => id.includes('WORD_COUNT') || id.includes('THIN_CONTENT') || id.includes('READABILITY'),
  },
  {
    id: 'content-uniqueness',
    category: 'content',
    label: 'Content Originality & Duplicate Clusters',
    weight: 4,
    ruleMatcher: (id) => id.includes('SIMILARITY') || id.includes('DUPLICATE'),
  },
  {
    id: 'content-orthography',
    category: 'content',
    label: 'Text Quality & Typographical Accuracy',
    weight: 3,
    ruleMatcher: (id) => id.includes('TYPO') || id.includes('SPELLING'),
  },
  {
    id: 'content-claims-trust',
    category: 'content',
    label: 'Factual Trust, Editorial Proof & About Evidence',
    weight: 3,
    ruleMatcher: (id) => id.includes('CLAIM') || id.includes('EAT') || id.includes('AUTHOR'),
  },

  // 4. Structured Data
  {
    id: 'sd-presence',
    category: 'structured_data',
    label: 'Structured Data (JSON-LD) Adoption',
    weight: 5,
    ruleMatcher: (id) => id.includes('SCHEMA_MISSING') || id.includes('STRUCTURED_DATA_MISSING'),
  },
  {
    id: 'sd-type-richness',
    category: 'structured_data',
    label: 'Entity & Rich Result Schema Types',
    weight: 4,
    ruleMatcher: (id) => id.includes('SCHEMA_TYPE') || id.includes('PRODUCT_SCHEMA') || id.includes('ORG_SCHEMA'),
  },
  {
    id: 'sd-dom-parity',
    category: 'structured_data',
    label: 'Schema-DOM Parity & Price/Spec Accuracy',
    weight: 4,
    ruleMatcher: (id) => id.includes('PARITY') || id.includes('SCHEMA_MISMATCH'),
  },
  {
    id: 'sd-syntax-validity',
    category: 'structured_data',
    label: 'Schema JSON-LD Syntax & Property Validity',
    weight: 4,
    ruleMatcher: (id) => id.includes('SYNTAX') || id.includes('INVALID_SCHEMA'),
  },

  // 5. AEO Readiness
  {
    id: 'aeo-direct-definitions',
    category: 'aeo',
    label: 'Direct Answer & Definitional Block Targets',
    weight: 5,
    ruleMatcher: (id) => id.includes('DEFINITION') || id.includes('DIRECT_ANSWER'),
  },
  {
    id: 'aeo-structured-lists',
    category: 'aeo',
    label: 'Information Extraction Tables & Ordered Lists',
    weight: 4,
    ruleMatcher: (id) => id.includes('TABLE') || id.includes('LIST'),
  },
  {
    id: 'aeo-faq-architecture',
    category: 'aeo',
    label: 'Question-Answer Heading & FAQ Markup',
    weight: 4,
    ruleMatcher: (id) => id.includes('FAQ') || id.includes('QUESTION'),
  },

  // 6. GEO Readiness
  {
    id: 'geo-discoverability',
    category: 'geo',
    label: 'Machine Discoverability (/llms.txt at root)',
    weight: 4,
    isSiteWide: true,
    ruleMatcher: (id) => id.includes('LLMS_TXT') || id.includes('GEO_DISCOVERABILITY'),
  },
  {
    id: 'geo-entity-clarity',
    category: 'geo',
    label: 'Entity Disambiguation & Semantic Grounding',
    weight: 4,
    ruleMatcher: (id) => id.includes('ENTITY') || id.includes('GEO_BRAND'),
  },
  {
    id: 'geo-unambiguous-anchors',
    category: 'geo',
    label: 'Descriptive Anchor Text vs Vague Fallbacks',
    weight: 3,
    ruleMatcher: (id) => id.includes('WEAK_LINK') || id.includes('AMBIGUOUS_ANCHOR'),
  },
  {
    id: 'geo-factual-citations',
    category: 'geo',
    label: 'Factual Citation Grounding & Source Authority',
    weight: 3,
    ruleMatcher: (id) => id.includes('CITATION') || id.includes('SUBSTANTIATION'),
  },

  // 7. Performance
  {
    id: 'perf-response-time',
    category: 'performance',
    label: 'Server Response Time (TTFB < 800ms)',
    weight: 4,
    ruleMatcher: (id) => id.includes('RESPONSE_TIME') || id.includes('SLOW_'),
  },
  {
    id: 'perf-compression',
    category: 'performance',
    label: 'Asset Compression & Caching Headers',
    weight: 3,
    ruleMatcher: (id) => id.includes('COMPRESSION') || id.includes('CACHE'),
  },
  {
    id: 'perf-dom-lightweight',
    category: 'performance',
    label: 'DOM Node Budget & Asset Density',
    weight: 3,
    ruleMatcher: (id) => id.includes('DOM_') || id.includes('PAYLOAD_'),
  },
];

// Extracts stable rule family prefix from finding ID
export function extractRuleFamily(id: string): string {
  const urlIdx = id.indexOf('http');
  if (urlIdx > 0) {
    return id.substring(0, urlIdx).replace(/[-_]+$/, '');
  }
  const parts = id.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return id;
}

export function calculateAuditScores(
  findings: Finding[],
  successfulPagesCount: number = 1,
  isCrawlFailed: boolean = false
): {
  overallScore: number;
  categoryScores: CategoryScore[];
  confidence: 'high' | 'medium' | 'low';
} {
  // If crawl failed or no pages fetched, do not manufacture fake scores.
  if (isCrawlFailed || successfulPagesCount === 0) {
    return {
      overallScore: 0,
      confidence: 'low',
      categoryScores: CATEGORY_DEFINITIONS.map((def) => ({
        category: def.category,
        label: def.label,
        score: 0,
        weight: def.weight,
        status: 'incomplete',
        findingsCount: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          informational: 0,
        },
      })),
    };
  }

  const categoryScores: CategoryScore[] = [];
  let weightedScoreSum = 0;
  let totalCategoryWeights = 0;

  // Track critical blockers for severity gates
  let hasCriticalBlocker = false;
  let criticalFindingsCount = 0;

  for (const def of CATEGORY_DEFINITIONS) {
    const categoryFindings = findings.filter((f) => f.category === def.category);

    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };

    for (const f of categoryFindings) {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
      if (f.severity === 'critical') {
        criticalFindingsCount++;
        // Check for site-wide blocker
        const urls = f.affectedUrls || (f.affectedUrl ? [f.affectedUrl] : []);
        if (
          f.id.includes('SITE_WIDE_NOINDEX') ||
          f.id.includes('DNS_FAILURE') ||
          f.id.includes('HOMEPAGE_DOWN') ||
          f.id.includes('TLS_ERROR') ||
          urls.length >= successfulPagesCount * 0.8
        ) {
          hasCriticalBlocker = true;
        }
      }
    }

    // Get check families for this category
    const families = CHECK_FAMILIES.filter((cf) => cf.category === def.category);

    let familyWeightedScore = 0;
    let familyTotalWeight = 0;

    for (const family of families) {
      // Find all non-informational findings matching this family
      const matchingFindings = categoryFindings.filter(
        (f) => f.severity !== 'informational' && family.ruleMatcher(f.id)
      );

      // Collect unique failing URLs to prevent correlated deductions
      const failingUrls = new Set<string>();
      let maxSeverityWeightMultiplier = 1.0;

      for (const finding of matchingFindings) {
        if (finding.severity === 'critical') maxSeverityWeightMultiplier = Math.max(maxSeverityWeightMultiplier, 1.3);
        else if (finding.severity === 'high') maxSeverityWeightMultiplier = Math.max(maxSeverityWeightMultiplier, 1.1);

        const urls = finding.affectedUrls || (finding.affectedUrl ? [finding.affectedUrl] : []);
        if (urls.length > 0) {
          for (const url of urls) {
            failingUrls.add(url);
          }
        } else {
          // If no specific URL listed, it's site-wide
          failingUrls.add('SITE_WIDE');
        }
      }

      let passRate = 1.0;

      if (family.isSiteWide) {
        // Binary 0 or 1 for site-wide checks
        passRate = failingUrls.size > 0 ? 0 : 1;
      } else {
        const failingCount = failingUrls.has('SITE_WIDE')
          ? successfulPagesCount
          : Math.min(failingUrls.size, successfulPagesCount);

        passRate = Math.max(0, (successfulPagesCount - failingCount) / successfulPagesCount);
      }

      // Penalty damping based on severity multiplier
      const adjustedWeight = family.weight * maxSeverityWeightMultiplier;
      familyWeightedScore += passRate * adjustedWeight;
      familyTotalWeight += adjustedWeight;
    }

    // Fallback if no specific families matched
    const categoryRawScore =
      familyTotalWeight > 0
        ? Math.round((familyWeightedScore / familyTotalWeight) * 100)
        : 100;

    // Severity Capping: Critical findings in a single category cannot drop it below 10 unless site-wide
    const finalCategoryScore = Math.max(0, Math.min(100, categoryRawScore));

    categoryScores.push({
      category: def.category,
      label: def.label,
      score: finalCategoryScore,
      weight: def.weight,
      status: 'complete',
      findingsCount: counts,
    });

    weightedScoreSum += finalCategoryScore * def.weight;
    totalCategoryWeights += def.weight;
  }

  let rawOverallScore = Math.round(weightedScoreSum / (totalCategoryWeights || 1));

  // Severity Gate 1: Site-wide critical blocker limits overall score to <= 40
  if (hasCriticalBlocker) {
    rawOverallScore = Math.min(rawOverallScore, 40);
  }

  // Severity Gate 2: Capped deduction for non-site-wide critical findings (max 35-point deduction)
  if (criticalFindingsCount > 0 && !hasCriticalBlocker) {
    const minScoreFloor = Math.max(0, 100 - criticalFindingsCount * 12);
    rawOverallScore = Math.min(rawOverallScore, minScoreFloor);
  }

  const confidence =
    successfulPagesCount >= 15 ? 'high' : successfulPagesCount >= 5 ? 'medium' : 'low';

  return {
    overallScore: Math.max(0, Math.min(100, rawOverallScore)),
    categoryScores,
    confidence,
  };
}

/**
 * Calculates deterministic per-page health score (0-100) for URL Explorer sorting.
 */
export function calculatePageHealthScore(
  page: ExtractedPageData,
  pageFindings: Finding[] = []
): number {
  if (page.failureCode || page.statusCode >= 400 || page.statusCode === 0) {
    return 0; // Completely broken or unreachable
  }

  let score = 100;

  // Title check
  if (!page.title || page.title.trim().length === 0) {
    score -= 15;
  } else if (page.titleLength < 30 || page.titleLength > 65) {
    score -= 5;
  }

  // H1 check
  if (!page.h1s || page.h1s.length === 0) {
    score -= 12;
  } else if (page.h1s.length > 1) {
    score -= 4;
  }

  // Meta description check
  if (!page.metaDescription || page.metaDescription.trim().length === 0) {
    score -= 8;
  }

  // Word count check
  if (page.wordCount < 150) {
    score -= 12;
  } else if (page.wordCount < 300) {
    score -= 6;
  }

  // Schema presence
  if (!page.structuredData || page.structuredData.length === 0) {
    score -= 10;
  }

  // Canonical tag check
  if (!page.canonicalUrl) {
    score -= 6;
  }

  // Images without alt
  const missingAltCount = page.images?.filter((img) => !img.alt || img.alt.trim() === '').length || 0;
  if (missingAltCount > 0) {
    score -= Math.min(10, missingAltCount * 3);
  }

  // Server response time
  if (page.fetchDurationMs > 1500) {
    score -= 8;
  } else if (page.fetchDurationMs > 800) {
    score -= 4;
  }

  // Additional deduction for page-specific critical/high findings
  for (const f of pageFindings) {
    if (f.severity === 'critical') score -= 15;
    else if (f.severity === 'high') score -= 8;
    else if (f.severity === 'medium') score -= 4;
  }

  return Math.max(0, Math.min(100, score));
}
