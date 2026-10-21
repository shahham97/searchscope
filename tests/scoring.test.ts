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

  it('correctly applies severity penalties with rule grouping', () => {
    const findings: Finding[] = [
      {
        id: 'TECH-SSL-1',
        category: 'technical',
        severity: 'critical', // base: 35, cap: 40
        title: 'Critical issue',
        evidence: 'test',
        affectedUrl: 'https://example.com',
        whyItMatters: 'test',
        confidence: 'high',
        recommendedFix: 'test',
        effort: 'quick_win',
        validationInstructions: 'test',
      },
      {
        id: 'TECH-ROBOTS-1',
        category: 'technical',
        severity: 'high', // base: 25, cap: 25
        title: 'High issue',
        evidence: 'test',
        affectedUrl: 'https://example.com',
        whyItMatters: 'test',
        confidence: 'high',
        recommendedFix: 'test',
        effort: 'quick_win',
        validationInstructions: 'test',
      },
    ];

    const { categoryScores } = calculateAuditScores(findings, 1);
    const techScore = categoryScores.find((c) => c.category === 'technical');
    // 100 - (35 + 25) = 40
    expect(techScore?.score).toBe(40);
  });

  it('does not allow category score to drop below 0', () => {
    const manyCriticalFindings: Finding[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `RULE-${i}-https://example.com/page/${i}`,
      category: 'technical',
      severity: 'critical',
      title: 'Critical issue',
      evidence: 'test',
      affectedUrl: 'https://example.com',
      whyItMatters: 'test',
      confidence: 'high',
      recommendedFix: 'test',
      effort: 'quick_win',
      validationInstructions: 'test',
    }));

    const { categoryScores } = calculateAuditScores(manyCriticalFindings, 10);
    const techScore = categoryScores.find((c) => c.category === 'technical');
    expect(techScore?.score).toBe(0);
  });
});
