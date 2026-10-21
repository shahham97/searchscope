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

  it('correctly applies severity penalties', () => {
    const findings: Finding[] = [
      {
        id: 'F-1',
        category: 'technical',
        severity: 'critical', // -15
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
        id: 'F-2',
        category: 'technical',
        severity: 'high', // -8
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

    const { categoryScores } = calculateAuditScores(findings);
    const techScore = categoryScores.find((c) => c.category === 'technical');
    // 100 - (15 + 8) = 77
    expect(techScore?.score).toBe(77);
  });

  it('does not allow category score to drop below 0', () => {
    const manyCriticalFindings: Finding[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `F-${i}`,
      category: 'technical',
      severity: 'critical', // 10 * 15 = 150 penalty
      title: 'Critical issue',
      evidence: 'test',
      affectedUrl: 'https://example.com',
      whyItMatters: 'test',
      confidence: 'high',
      recommendedFix: 'test',
      effort: 'quick_win',
      validationInstructions: 'test',
    }));

    const { categoryScores } = calculateAuditScores(manyCriticalFindings);
    const techScore = categoryScores.find((c) => c.category === 'technical');
    expect(techScore?.score).toBe(0);
  });
});
