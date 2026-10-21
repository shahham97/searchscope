import { describe, it, expect } from 'vitest';
import {
  seedBrandFactsFromAudit,
  validateContentAgainstBrandFacts,
  generateFactsNeededMarkdown,
} from '../src/lib/agent/brand-facts';
import { AuditReport } from '../src/types/audit';

describe('Brand Facts & Compliance Guardrails', () => {
  const mockReport: AuditReport = {
    id: 'test-bf-1',
    auditDate: new Date().toISOString(),
    targetDomain: 'kingshyer.com',
    targetNormalizedUrl: 'https://kingshyer.com/',
    siteTitle: 'Kingshyer — Luxury Perfume Oils',
    organizationName: 'Kingshyer',
    config: {} as any,
    crawlerUserAgent: 'SearchScope-Auditor/1.0',
    overallScore: 85,
    isCrawlFailed: false,
    diagnostics: [],
    categoryScores: [],
    crawlStats: {
      totalPagesDiscovered: 50,
      totalPagesCrawled: 50,
      totalPagesSkipped: 0,
      totalPagesFailed: 0,
      successfulPagesCount: 50,
      skippedRobotsCount: 0,
      skippedNonHtmlCount: 0,
      notCrawledLimitCount: 0,
      crawlDurationMs: 5000,
      robotsTxtPresent: true,
      sitemapDetected: true,
      sitemapsFound: [],
      llmsTxtPresent: true,
      crawlBudgetExhausted: false,
    },
    pages: [
      {
        url: 'https://kingshyer.com/product/royal',
        textSnippet: 'Our pure perfume oil is alcohol-free and cruelty-free.',
      } as any,
    ],
    findings: [],
    keywordCandidates: [],
    searchObservations: [],
    competitors: [],
    roadMap: [],
    complianceClaims: [
      {
        id: 'CLAIM-1',
        category: 'origin_making',
        riskLevel: 'high',
        claimText: 'handcrafted in Canberra',
        url: 'https://kingshyer.com/',
        location: 'Homepage',
        whyRisky: 'Country of origin requires substantiation',
        ownerAction: 'Confirm records',
        verified: false,
      },
      {
        id: 'CLAIM-2',
        category: 'performance_health',
        riskLevel: 'high',
        claimText: 'lasts 14 hours',
        url: 'https://kingshyer.com/product/royal',
        location: 'Product Page',
        whyRisky: 'Specific wear duration requires evidence',
        ownerAction: 'Provide panel testing',
        verified: false,
      },
    ],
    methodology: 'Deterministic',
    disclaimers: [],
  };

  it('seeds initial brand facts with unverified origin status and detected claims', () => {
    const facts = seedBrandFactsFromAudit(mockReport);

    expect(facts.tradingName).toBe('Kingshyer');
    expect(facts.countryOfOrigin.isOriginVerified).toBe(false);
    expect(facts.productClaims.alcoholFree).toBe(true);
    expect(facts.productClaims.crueltyFree).toBe(true);
    expect(facts.productClaims.testedWearDurationHours).toBeUndefined();
    expect(facts.reviewPolicy.noEmployeeOrFamilyReviews).toBe(true);
  });

  it('flags unverified claims and prohibited statements', () => {
    const facts = seedBrandFactsFromAudit(mockReport);

    // 1. Prohibited claim
    const res1 = validateContentAgainstBrandFacts(
      'Our artisanal oil cures skin conditions overnight.',
      facts
    );
    expect(res1.compliant).toBe(false);
    expect(res1.violations.some((v) => v.includes('cures skin conditions'))).toBe(true);

    // 2. Unverified origin assertion
    const res2 = validateContentAgainstBrandFacts(
      'Proudly 100% made in Australia with local essences.',
      facts
    );
    expect(res2.compliant).toBe(false);
    expect(res2.factsNeeded.some((f) => f.includes('Country of origin certification'))).toBe(true);

    // 3. Unverified numeric wear time
    const res3 = validateContentAgainstBrandFacts(
      'Guaranteed formulation that lasts 16 hours on skin.',
      facts
    );
    expect(res3.compliant).toBe(false);
    expect(res3.factsNeeded.some((f) => f.includes('lasts 16 hours'))).toBe(true);
  });

  it('generates structured FACTS_NEEDED.md questionnaire', () => {
    const facts = seedBrandFactsFromAudit(mockReport);
    const md = generateFactsNeededMarkdown(mockReport, facts);

    expect(md).toContain('# SearchScope: Brand Facts Verification Questionnaire');
    expect(md).toContain('## 1. Business & Legal Identity');
    expect(md).toContain('## 2. Origin & Manufacturing Substantiation');
    expect(md).toContain('## 3. Product Specifications & Wear Durations');
    expect(md).toContain('## 4. Customer Review Integrity Baseline');
    expect(md).toContain('## 5. Prohibited Claims Checklist');
  });
});
