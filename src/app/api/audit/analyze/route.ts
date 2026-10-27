import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ResultLedger } from '@/lib/crawler/ledger';
import { analyzeTechnicalSeo } from '@/lib/analyzer/technical-seo';
import { analyzeOnPageSeo } from '@/lib/analyzer/onpage-seo';
import { analyzeStructuredData } from '@/lib/analyzer/structured-data';
import { analyzeContentQuality } from '@/lib/analyzer/content-quality';
import { analyzeAeo } from '@/lib/analyzer/aeo';
import { analyzeGeo } from '@/lib/analyzer/geo';
import { analyzeImageAltQuality } from '@/lib/analyzer/image-quality';
import { analyzeTextQualityAndTypos } from '@/lib/analyzer/typo-detector';
import { analyzeFacetedAndFallbackUrls } from '@/lib/analyzer/faceted-urls';
import { analyzeContentSimilarity } from '@/lib/analyzer/similarity';
import { analyzeWeakAndAmbiguousLinks } from '@/lib/analyzer/weak-links';
import { analyzeSchemaDomParity } from '@/lib/analyzer/schema-parity';
import { analyzeSocialMetadata } from '@/lib/analyzer/social-metadata';
import { analyzeContentClaimsAndRisks } from '@/lib/analyzer/claim-risk-detector';
import {
  extractCandidateKeywords,
  buildSearchObservations,
  buildKeywordMap,
  detectKeywordCannibalization,
} from '@/lib/analyzer/search-intelligence';
import { calculateAuditScores, calculatePageHealthScore } from '@/lib/analyzer/scoring';
import { buildPrioritizedRoadmap } from '@/lib/analyzer/roadmap';
import { AuditConfig, AuditReport, ClaimItem, Finding } from '@/types/audit';
import { BOT_USER_AGENT, BROWSER_USER_AGENT } from '@/lib/security/safe-fetch';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetUrl,
      canonicalOrigin,
      canonicalHostname,
      config = {},
      pages = [],
      ledgerEntries = [],
      diagnostics = [],
      sitemapsFound = [],
      robotsTxtPresent = false,
      llmsTxtPresent = false,
      crawlDurationMs = 0,
      aiBotsAudit,
      samplingDistribution,
    } = body;

    const effectiveConfig: AuditConfig = {
      targetUrl: targetUrl || canonicalOrigin,
      auditDepth: config.auditDepth || 'quick',
      maxPages: config.maxPages || 100,
      includeContentAnalysis: config.includeContentAnalysis ?? true,
      includeAeoGeo: config.includeAeoGeo ?? true,
      includeStructuredData: config.includeStructuredData ?? true,
      checkBrokenLinks: config.checkBrokenLinks ?? true,
      searchDiscoveryEnabled: config.searchDiscoveryEnabled ?? false,
      userAgentType: config.userAgentType || 'browser',
      respectRobotsTxt: config.respectRobotsTxt ?? true,
      enableHeadlessRendering: config.enableHeadlessRendering ?? false,
    };

    // Reconstruct ledger from entries
    const ledger = new ResultLedger(ledgerEntries);
    const ledgerSummary = ledger.reconcile();

    const isCrawlFailed = ledgerSummary.crawledOk === 0 && pages.length > 0;
    const crawlFailureReason = isCrawlFailed
      ? `All ${pages.length} attempted page fetches failed. See Crawl Diagnostics for details.`
      : undefined;

    // Run analyzers
    const allFindings: Finding[] = [];
    let complianceClaims: ClaimItem[] = [];

    if (!isCrawlFailed && pages.length > 0) {
      allFindings.push(...analyzeTechnicalSeo(pages, sitemapsFound, robotsTxtPresent));
      allFindings.push(...analyzeOnPageSeo(pages));
      allFindings.push(...analyzeImageAltQuality(pages));
      allFindings.push(...analyzeSocialMetadata(pages));
      allFindings.push(...analyzeFacetedAndFallbackUrls(pages));
      allFindings.push(...analyzeWeakAndAmbiguousLinks(pages));

      if (effectiveConfig.includeStructuredData) {
        allFindings.push(...analyzeStructuredData(pages));
        allFindings.push(...analyzeSchemaDomParity(pages));
      }

      if (effectiveConfig.includeContentAnalysis) {
        allFindings.push(...analyzeContentQuality(pages));
        allFindings.push(...analyzeTextQualityAndTypos(pages));
        allFindings.push(...analyzeContentSimilarity(pages));

        const claimResult = analyzeContentClaimsAndRisks(pages);
        allFindings.push(...claimResult.findings);
        complianceClaims = claimResult.claims;
      }

      if (effectiveConfig.includeAeoGeo) {
        allFindings.push(...analyzeAeo(pages));
        allFindings.push(...analyzeGeo(pages, llmsTxtPresent));
      }
    }

    // Candidate Keywords & Search Intelligence
    const candidateKeywords = !isCrawlFailed ? extractCandidateKeywords(pages) : [];
    const keywordMap = !isCrawlFailed ? buildKeywordMap(candidateKeywords, pages) : undefined;
    const { issues: cannibalizationIssues, findings: cannibalizationFindings } =
      !isCrawlFailed
        ? detectKeywordCannibalization(pages, candidateKeywords)
        : { issues: [], findings: [] };

    allFindings.push(...cannibalizationFindings);

    // Deduplicate findings by finding ID
    const uniqueFindingsMap = new Map<string, Finding>();
    for (const f of allFindings) {
      if (!uniqueFindingsMap.has(f.id)) {
        uniqueFindingsMap.set(f.id, f);
      }
    }
    const uniqueFindings = Array.from(uniqueFindingsMap.values());

    // Compute per-page health scores (0-100)
    for (const page of pages) {
      const pageFindings = uniqueFindings.filter(
        (f: any) =>
          f.affectedUrls?.includes(page.url) ||
          f.affectedUrls?.includes(page.normalizedUrl)
      );
      page.pageHealthScore = calculatePageHealthScore(page, pageFindings);
    }

    const { observations, competitors } = buildSearchObservations(
      canonicalHostname,
      candidateKeywords,
      effectiveConfig.searchDiscoveryEnabled
    );

    const { overallScore, categoryScores, confidence } = calculateAuditScores(
      uniqueFindings,
      ledgerSummary.crawledOk,
      isCrawlFailed
    );

    const categoryFindingsSum = categoryScores.reduce(
      (acc, c) =>
        acc +
        c.findingsCount.critical +
        c.findingsCount.high +
        c.findingsCount.medium +
        c.findingsCount.low +
        c.findingsCount.informational,
      0
    );

    const dataIntegrity = ledger.toIntegrityReport(uniqueFindings.length, categoryFindingsSum);

    const crawledCount = ledgerSummary.crawledOk + ledgerSummary.failed;
    const discoveredCount = ledgerSummary.discovered;
    const coveragePercentage =
      discoveredCount > 0 ? Math.round((crawledCount / discoveredCount) * 100) : 100;

    const uncrawledUrls = ledger.getEntriesByState('not_crawled_limit').map((e) => e.url);

    const crawlStats = {
      totalPagesDiscovered: discoveredCount,
      totalPagesCrawled: crawledCount,
      totalPagesSkipped: ledgerSummary.skippedRobots + ledgerSummary.skippedNonHtml,
      totalPagesFailed: ledgerSummary.failed,
      successfulPagesCount: ledgerSummary.crawledOk,
      skippedRobotsCount: ledgerSummary.skippedRobots,
      skippedNonHtmlCount: ledgerSummary.skippedNonHtml,
      notCrawledLimitCount: ledgerSummary.notCrawledLimit,
      uncrawledUrls,
      crawlDurationMs,
      robotsTxtPresent,
      sitemapDetected: sitemapsFound.length > 0,
      sitemapsFound,
      llmsTxtPresent,
      crawlBudgetExhausted: ledgerSummary.notCrawledLimit > 0,
      aiBotsAudit,
    };

    const crawlCoverage = {
      crawled: crawledCount,
      discovered: discoveredCount,
      percentage: coveragePercentage,
      summary: samplingDistribution
        ? samplingDistribution
        : `${crawledCount} of ${discoveredCount} pages crawled (${coveragePercentage}% sample). Scores reflect sampled pages.`,
    };

    const roadMap = !isCrawlFailed ? buildPrioritizedRoadmap(uniqueFindings) : [];

    const homePage = pages.find((p: any) => p.statusCode === 200 && p.isHtml) || pages[0];
    const siteTitle = homePage?.title || canonicalHostname;
    let organizationName = canonicalHostname;
    if (homePage?.structuredData) {
      const orgSchema = homePage.structuredData.find((sd: any) =>
        sd.type?.toLowerCase().includes('organization')
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
      targetDomain: canonicalHostname,
      targetNormalizedUrl: canonicalOrigin,
      siteTitle,
      organizationName,
      faviconUrl: `${canonicalOrigin}/favicon.ico`,
      config: effectiveConfig,
      crawlerUserAgent:
        effectiveConfig.userAgentType === 'bot' ? BOT_USER_AGENT : BROWSER_USER_AGENT,
      overallScore,
      scoreConfidence: confidence,
      crawlCoverage,
      isCrawlFailed,
      crawlFailureReason,
      diagnostics,
      categoryScores,
      crawlStats,
      dataIntegrity,
      ledgerEntries: ledger.getAllEntries(),
      pages,
      findings: uniqueFindings,
      keywordCandidates: candidateKeywords,
      keywordMap,
      cannibalizationIssues,
      searchObservations: observations,
      competitors,
      roadMap,
      complianceClaims,
      methodology:
        'Deterministic rule-based audit engine evaluating crawlability, indexability, metadata completeness, semantic heading architecture, Structured Data (Schema.org JSON-LD), content depth, readability ease (Flesch-Kincaid), Answer Engine Optimization (AEO) direct-answer structure, and Generative Engine Optimization (GEO) machine-readability cues.',
      disclaimers: [
        'Internal audit scores reflect deterministic technical guidelines and best practices; they are not official Google, Bing, or OpenAI ranking formulas.',
        'No account credentials, private analytics, or paid proprietary SEO databases were accessed.',
        'Audit state is transient and held in active memory during the session only. No database or persistent storage is maintained.',
        'Search results and AI engine answers vary dynamically based on geolocation, personalization, device type, and temporal updates.',
      ],
    };

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Audit analysis failed' },
      { status: 500 }
    );
  }
}
