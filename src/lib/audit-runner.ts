import { executeBoundedCrawl } from './crawler/crawler';
import { analyzeTechnicalSeo } from './analyzer/technical-seo';
import { analyzeOnPageSeo } from './analyzer/onpage-seo';
import { analyzeStructuredData } from './analyzer/structured-data';
import { analyzeContentQuality } from './analyzer/content-quality';
import { analyzeAeo } from './analyzer/aeo';
import { analyzeGeo } from './analyzer/geo';
import { analyzeImageAltQuality } from './analyzer/image-quality';
import { analyzeTextQualityAndTypos } from './analyzer/typo-detector';
import { analyzeFacetedAndFallbackUrls } from './analyzer/faceted-urls';
import { analyzeContentSimilarity } from './analyzer/similarity';
import { analyzeWeakAndAmbiguousLinks } from './analyzer/weak-links';
import { analyzeSchemaDomParity } from './analyzer/schema-parity';
import { analyzeSocialMetadata } from './analyzer/social-metadata';
import { extractCandidateKeywords, buildSearchObservations } from './analyzer/search-intelligence';
import { calculateAuditScores } from './analyzer/scoring';
import { buildPrioritizedRoadmap } from './analyzer/roadmap';
import { AuditConfig, AuditReport, Finding } from '../types/audit';
import { validateTargetUrl } from './security/ssrf';

export async function runCompleteAudit(
  rawUrl: string,
  config: Partial<AuditConfig> = {},
  onProgress?: (progress: {
    status: string;
    crawledCount: number;
    discoveredCount: number;
    currentUrl: string;
  }) => void
): Promise<AuditReport> {
  // 1. SSRF and Domain Safety Check
  const validation = await validateTargetUrl(rawUrl);
  if (!validation.isValid || !validation.normalizedUrl) {
    throw new Error(validation.error || 'Failed safety validation.');
  }

  const effectiveConfig: AuditConfig = {
    targetUrl: validation.normalizedUrl,
    auditDepth: config.auditDepth || 'quick',
    maxPages:
      config.maxPages ||
      (config.auditDepth === 'quick' ? 25 : config.auditDepth === 'deep' ? 250 : 100),
    includeContentAnalysis: config.includeContentAnalysis ?? true,
    includeAeoGeo: config.includeAeoGeo ?? true,
    includeStructuredData: config.includeStructuredData ?? true,
    checkBrokenLinks: config.checkBrokenLinks ?? true,
    searchDiscoveryEnabled: config.searchDiscoveryEnabled ?? false,
    userAgentType: config.userAgentType || 'browser',
    respectRobotsTxt: config.respectRobotsTxt ?? true,
    enableHeadlessRendering: config.enableHeadlessRendering ?? false,
  };

  // 2. Execute Crawler
  const crawlResult = await executeBoundedCrawl(
    validation.normalizedUrl,
    effectiveConfig,
    onProgress
  );
  const {
    pages,
    crawlStats,
    diagnostics,
    isCrawlFailed,
    crawlFailureReason,
    targetNormalizedUrl,
    targetDomain,
  } = crawlResult;

  onProgress?.({
    status: 'Analyzing crawl evidence across technical, on-page, AEO, and GEO dimensions...',
    crawledCount: pages.length,
    discoveredCount: crawlStats.totalPagesDiscovered,
    currentUrl: targetNormalizedUrl,
  });

  // 3. Run Analysis Engines only if crawl succeeded or yielded real pages
  const allFindings: Finding[] = [];

  if (!isCrawlFailed) {
    // Technical SEO
    const techFindings = analyzeTechnicalSeo(
      pages,
      crawlStats.sitemapsFound,
      crawlStats.robotsTxtPresent
    );
    allFindings.push(...techFindings);

    // On-page SEO & Image Quality
    const onpageFindings = analyzeOnPageSeo(pages);
    allFindings.push(...onpageFindings);

    const imageQualityFindings = analyzeImageAltQuality(pages);
    allFindings.push(...imageQualityFindings);

    const socialFindings = analyzeSocialMetadata(pages);
    allFindings.push(...socialFindings);

    const facetedFindings = analyzeFacetedAndFallbackUrls(pages);
    allFindings.push(...facetedFindings);

    const weakLinksFindings = analyzeWeakAndAmbiguousLinks(pages);
    allFindings.push(...weakLinksFindings);

    // Structured Data & DOM Parity
    if (effectiveConfig.includeStructuredData) {
      const schemaFindings = analyzeStructuredData(pages);
      allFindings.push(...schemaFindings);

      const parityFindings = analyzeSchemaDomParity(pages);
      allFindings.push(...parityFindings);
    }

    // Content Quality & Typos & Similarity
    if (effectiveConfig.includeContentAnalysis) {
      const contentFindings = analyzeContentQuality(pages);
      allFindings.push(...contentFindings);

      const typoFindings = analyzeTextQualityAndTypos(pages);
      allFindings.push(...typoFindings);

      const similarityFindings = analyzeContentSimilarity(pages);
      allFindings.push(...similarityFindings);
    }

    // AEO & GEO
    if (effectiveConfig.includeAeoGeo) {
      const aeoFindings = analyzeAeo(pages);
      allFindings.push(...aeoFindings);

      const geoFindings = analyzeGeo(pages, crawlStats.llmsTxtPresent);
      allFindings.push(...geoFindings);
    }
  }

  // Deduplicate findings by finding ID to prevent duplicate React keys or double scoring
  const uniqueFindingsMap = new Map<string, Finding>();
  for (const f of allFindings) {
    if (!uniqueFindingsMap.has(f.id)) {
      uniqueFindingsMap.set(f.id, f);
    }
  }
  const uniqueFindings = Array.from(uniqueFindingsMap.values());

  // Candidate Keywords
  const candidateKeywords = !isCrawlFailed ? extractCandidateKeywords(pages) : [];

  // Search Observations
  const { observations, competitors } = buildSearchObservations(
    targetDomain,
    candidateKeywords,
    effectiveConfig.searchDiscoveryEnabled
  );

  // Scoring
  const { overallScore, categoryScores } = calculateAuditScores(
    uniqueFindings,
    crawlStats.successfulPagesCount
  );

  // Roadmap
  const roadMap = !isCrawlFailed ? buildPrioritizedRoadmap(uniqueFindings) : [];

  // Site title and branding heuristics
  const homePage = pages.find((p) => p.statusCode === 200 && p.isHtml) || pages[0];
  const siteTitle = homePage?.title || targetDomain;
  let organizationName = targetDomain;
  if (homePage) {
    const orgSchema = homePage.structuredData?.find((sd) =>
      sd.type.toLowerCase().includes('organization')
    );
    if (orgSchema) {
      try {
        const parsed = JSON.parse(orgSchema.rawJson);
        if (parsed.name) organizationName = parsed.name;
      } catch {
        // ignore
      }
    }
  }

  const report: AuditReport = {
    id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
    auditDate: new Date().toISOString(),
    targetDomain,
    targetNormalizedUrl,
    siteTitle,
    organizationName,
    faviconUrl: `${new URL(targetNormalizedUrl).origin}/favicon.ico`,
    config: effectiveConfig,
    crawlerUserAgent: 'SearchScope-Auditor/1.0 (+https://searchscope.app/bot)',
    overallScore,
    isCrawlFailed,
    crawlFailureReason,
    diagnostics,
    categoryScores,
    crawlStats,
    pages,
    findings: uniqueFindings,
    keywordCandidates: candidateKeywords,
    searchObservations: observations,
    competitors,
    roadMap,
    methodology:
      'Deterministic rule-based audit engine evaluating crawlability, indexability, metadata completeness, semantic heading architecture, Structured Data (Schema.org JSON-LD), content depth, readability ease (Flesch-Kincaid), Answer Engine Optimization (AEO) direct-answer structure, and Generative Engine Optimization (GEO) machine-readability cues.',
    disclaimers: [
      'Internal audit scores reflect deterministic technical guidelines and best practices; they are not official Google, Bing, or OpenAI ranking formulas.',
      'No account credentials, private analytics, or paid proprietary SEO databases were accessed.',
      'Audit state is transient and held in active memory during the session only. No database or persistent storage is maintained.',
      'Search results and AI engine answers vary dynamically based on geolocation, personalization, device type, and temporal updates.',
    ],
  };

  return report;
}
