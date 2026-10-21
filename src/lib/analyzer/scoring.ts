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

// Base severity penalty multiplier
const SEVERITY_BASE_PENALTIES: Record<Severity, number> = {
  critical: 35,
  high: 25,
  medium: 15,
  low: 8,
  informational: 0,
};

// Maximum penalty a single rule family can deduct from a category (0-100)
const RULE_CAPS: Record<Severity, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 8,
  informational: 0,
};

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
  // If crawl failed or no pages fetched, do not manufacture fake 100% scores.
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

    // Group findings by rule family to compute capped penalties
    const ruleGroups = new Map<string, Finding[]>();

    for (const f of categoryFindings) {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
      const ruleFamily = extractRuleFamily(f.id);
      if (!ruleGroups.has(ruleFamily)) {
        ruleGroups.set(ruleFamily, []);
      }
      ruleGroups.get(ruleFamily)!.push(f);
    }

    let totalPenalty = 0;

    for (const [, group] of ruleGroups) {
      let maxSeverity: Severity = 'low';
      for (const item of group) {
        if (item.severity === 'critical') {
          maxSeverity = 'critical';
          break;
        }
        if (item.severity === 'high') {
          maxSeverity = 'high';
        } else if (item.severity === 'medium' && maxSeverity !== 'high') {
          maxSeverity = 'medium';
        }
      }

      const basePenalty = SEVERITY_BASE_PENALTIES[maxSeverity] || 0;
      const ruleCap = RULE_CAPS[maxSeverity] || 25;

      const affectedRatio = Math.min(1, group.length / Math.max(1, successfulPagesCount));
      const calculatedPenalty = Math.round(basePenalty * (0.35 + 0.65 * affectedRatio));
      const penalty = Math.min(ruleCap, calculatedPenalty);

      totalPenalty += penalty;
    }

    const rawScore = Math.max(0, Math.min(100, 100 - totalPenalty));

    categoryScores.push({
      category: def.category,
      label: def.label,
      score: rawScore,
      weight: def.weight,
      status: 'complete',
      findingsCount: counts,
    });

    weightedScoreSum += rawScore * def.weight;
    totalWeight += def.weight;
  }

  const overallScore = Math.round(weightedScoreSum / (totalWeight || 1));
  const confidence =
    successfulPagesCount >= 15 ? 'high' : successfulPagesCount >= 5 ? 'medium' : 'low';

  return {
    overallScore,
    categoryScores,
    confidence,
  };
}
