import { describe, it, expect } from 'vitest';
import { calculateAuditScores, calculatePageHealthScore } from '../src/lib/analyzer/scoring';
import { CALIBRATION_FIXTURES } from './calibration/fixtures';
import { Finding } from '../src/types/audit';

describe('Part B: Pass-Rate Scoring & Calibration Suite', () => {
  // 1. Verify all 12 calibration archetypes score within expected bands
  describe('12-Site Calibration Corpus', () => {
    for (const fixture of CALIBRATION_FIXTURES) {
      it(`calibrates "${fixture.name}" (${fixture.id}) within [${fixture.expectedOverallMin}, ${fixture.expectedOverallMax}]`, () => {
        const { overallScore, categoryScores } = calculateAuditScores(
          fixture.findings,
          fixture.pages.length,
          false
        );

        expect(overallScore).toBeGreaterThanOrEqual(fixture.expectedOverallMin);
        expect(overallScore).toBeLessThanOrEqual(fixture.expectedOverallMax);

        if (fixture.expectedCategoryBands) {
          for (const [cat, band] of Object.entries(fixture.expectedCategoryBands)) {
            const catScoreObj = categoryScores.find((c) => c.category === cat);
            expect(catScoreObj).toBeDefined();
            expect(catScoreObj!.score).toBeGreaterThanOrEqual(band.min);
            expect(catScoreObj!.score).toBeLessThanOrEqual(band.max);
          }
        }
      });
    }
  });

  // 2. Strict Severity Gates
  describe('Severity Gates', () => {
    it('limits score to <= 40 when critical site-wide blocker is present', () => {
      const criticalFinding: Finding = {
        id: 'TECH_CRITICAL_SITE_WIDE_NOINDEX',
        category: 'technical',
        severity: 'critical',
        title: 'Site-wide noindex active',
        description: 'Blocks all search engines',
        evidence: '<meta name="robots" content="noindex" /> on all pages',
        recommendedFix: 'Remove noindex directive',
        affectedUrls: ['https://example.com/a', 'https://example.com/b', 'https://example.com/c'],
      };

      const result = calculateAuditScores([criticalFinding], 3, false);
      expect(result.overallScore).toBeLessThanOrEqual(40);
    });

    it('ensures informational findings have zero weight and never lower scores', () => {
      const baseline = calculateAuditScores([], 5, false);

      const infoFinding: Finding = {
        id: 'TECH_INFO_CDN_DETECTED',
        category: 'technical',
        severity: 'informational',
        title: 'Cloudflare CDN Detected',
        description: 'Site is served through Cloudflare edge proxy',
        evidence: 'CF-Cache-Status header present',
        recommendedFix: 'Informational note',
        affectedUrls: ['https://example.com/'],
      };

      const withInfo = calculateAuditScores([infoFinding], 5, false);
      expect(withInfo.overallScore).toBe(baseline.overallScore);
      for (let i = 0; i < baseline.categoryScores.length; i++) {
        expect(withInfo.categoryScores[i].score).toBe(baseline.categoryScores[i].score);
      }
    });
  });

  // 3. Property Test: Monotonicity Guarantee
  describe('Monotonicity Guarantee Property Test', () => {
    it('guarantees fixing (removing) any finding never lowers any category or overall score', () => {
      const fixture = CALIBRATION_FIXTURES.find((f) => f.id === 'average-ecommerce-shopify')!;
      const baseline = calculateAuditScores(fixture.findings, fixture.pages.length, false);

      // Remove findings one by one and assert scores are greater than or equal to baseline
      for (let i = 0; i < fixture.findings.length; i++) {
        const remainingFindings = fixture.findings.filter((_, idx) => idx !== i);
        const improved = calculateAuditScores(remainingFindings, fixture.pages.length, false);

        expect(improved.overallScore).toBeGreaterThanOrEqual(baseline.overallScore);

        for (const baseCat of baseline.categoryScores) {
          const improvedCat = improved.categoryScores.find((c) => c.category === baseCat.category);
          expect(improvedCat).toBeDefined();
          expect(improvedCat!.score).toBeGreaterThanOrEqual(baseCat.score);
        }
      }
    });
  });

  // 4. Per-Page Health Score Calculation
  describe('Per-Page Health Score', () => {
    it('evaluates healthy page to 100', () => {
      const perfectPage = CALIBRATION_FIXTURES[0].pages[0];
      const health = calculatePageHealthScore(perfectPage, []);
      expect(health).toBe(100);
    });

    it('evaluates unreachable or 500 error page to 0', () => {
      const brokenPage = CALIBRATION_FIXTURES[4].pages[0];
      const health = calculatePageHealthScore(brokenPage, []);
      expect(health).toBe(0);
    });

    it('evaluates flawed page to a realistic score between 40 and 85', () => {
      const flawedPage = CALIBRATION_FIXTURES[1].pages[1]; // Shopify product with thin text
      const health = calculatePageHealthScore(flawedPage, []);
      expect(health).toBeGreaterThanOrEqual(40);
      expect(health).toBeLessThanOrEqual(85);
    });
  });
});
