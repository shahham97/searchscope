import { Category, CategoryScore, Finding, Severity } from '../../types/audit';

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

const SEVERITY_PENALTIES: Record<Severity, number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 2,
  informational: 0,
};

export function calculateAuditScores(
  findings: Finding[],
  successfulPagesCount: number = 1
): {
  overallScore: number;
  categoryScores: CategoryScore[];
  confidence: 'high' | 'medium' | 'low';
} {
  // If no pages were successfully fetched, do not manufacture fake scores
  if (successfulPagesCount === 0) {
    return {
      overallScore: 0,
      confidence: 'low',
      categoryScores: CATEGORY_DEFINITIONS.map((def) => ({
        category: def.category,
        label: def.label,
        score: 0,
        weight: def.weight,
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
  let totalWeight = 0;

  for (const def of CATEGORY_DEFINITIONS) {
    const categoryFindings = findings.filter((f) => f.category === def.category);

    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };

    let totalPenalty = 0;
    for (const f of categoryFindings) {
      counts[f.severity] += 1;
      totalPenalty += SEVERITY_PENALTIES[f.severity] || 0;
    }

    // Baseline 100 points, subtracting penalties
    const rawScore = Math.max(0, Math.min(100, 100 - totalPenalty));

    categoryScores.push({
      category: def.category,
      label: def.label,
      score: rawScore,
      weight: def.weight,
      findingsCount: counts,
    });

    weightedScoreSum += rawScore * def.weight;
    totalWeight += def.weight;
  }

  const overallScore = Math.round(weightedScoreSum / (totalWeight || 1));
  const confidence = successfulPagesCount >= 10 ? 'high' : successfulPagesCount >= 3 ? 'medium' : 'low';

  return {
    overallScore,
    categoryScores,
    confidence,
  };
}
