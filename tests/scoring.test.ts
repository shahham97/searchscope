import { describe, it, expect } from 'vitest';
import { calculateAuditScores, CATEGORY_DEFINITIONS } from '../src/lib/analyzer/scoring';
import { Finding } from '../src/types/audit';

describe('Deterministic Scoring Engine', () => {
  it('awards 100/100 score when zero negative findings exist', () => {
    const { overallScore, categoryScores } = calculateAuditScores([]);
    expect(overallScore).toBe(100);
    categoryScores.forEach((cat) => {
      expect(cat.score).toBe(100);
    });
  });

  it('correctly applies pass-rate scoring across check families', () => {
    const findings: Finding[] = [
      {
        id: 'TECH-TLS-ERROR',
        category: 'technical',
        severity: 'critical',
        title: 'Critical issue',
        evidence: 'test',
        affectedUrls: ['https://example.com'],
        whyItMatters: 'test',
        confidence: 'high',
        recommendedFix: 'test',
        effort: 'quick_win',
        validationInstructions: 'test',
      },
      {
        id: 'TECH-ROBOTS-BLOCKED',
        category: 'technical',
        severity: 'high',
        title: 'High issue',
        evidence: 'test',
        affectedUrls: ['https://example.com'],
        whyItMatters: 'test',
        confidence: 'high',
        recommendedFix: 'test',
        effort: 'quick_win',
        validationInstructions: 'test',
      },
    ];

    const { categoryScores } = calculateAuditScores(findings, 1);
    const techScore = categoryScores.find((c) => c.category === 'technical');
    expect(techScore).toBeDefined();
    expect(techScore?.score).toBeLessThan(85);
    expect(techScore?.score).toBeGreaterThan(0);
  });

  it('does not allow category score to drop below 0 when all check families fail', () => {
    const families = ['ROBOTS', 'CANONICAL', 'HTTPS', 'INDEX', 'BROKEN', 'VIEWPORT'];
    const manyCriticalFindings: Finding[] = families.map((fam, i) => ({
      id: `TECH-${fam}-${i}`,
      category: 'technical',
      severity: 'critical',
      title: 'Critical issue',
      evidence: 'test',
      affectedUrls: ['https://example.com/page/1'],
      whyItMatters: 'test',
      confidence: 'high',
      recommendedFix: 'test',
      effort: 'quick_win',
      validationInstructions: 'test',
    }));

    const { categoryScores } = calculateAuditScores(manyCriticalFindings, 1);
    const techScore = categoryScores.find((c) => c.category === 'technical');
    expect(techScore?.score).toBe(0);
  });
});
