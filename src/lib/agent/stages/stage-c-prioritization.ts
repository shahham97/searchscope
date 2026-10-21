import { Finding, CrawledPage, Severity } from '@/types/audit';
import { AgentConfig, SiteProfile } from '../types';

export interface PrioritizedFinding {
  finding: Finding;
  targetPage?: CrawledPage;
  impactScore: number; // 1-10
  confidenceScore: number; // 1-10
  effortScore: number; // 1-10
  priorityScore: number; // (impact * confidence) / effort
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  effortLevel: 'S' | 'M' | 'L';
  owner: 'content' | 'dev' | 'seo';
}

export function runStageCPrioritization(
  findings: Finding[],
  pages: CrawledPage[],
  siteProfile: SiteProfile,
  config: AgentConfig
): PrioritizedFinding[] {
  const pageMap = new Map<string, CrawledPage>();
  for (const page of pages) {
    pageMap.set(page.url, page);
  }

  // Filter findings according to config.scope
  const filtered = findings.filter((f) => {
    if (config.scope === 'metadata_only') {
      return (
        f.id.includes('TITLE') ||
        f.id.includes('META') ||
        f.id.includes('CANONICAL') ||
        f.category === 'onpage'
      );
    }
    if (config.scope === 'content_only') {
      return (
        f.category === 'content' ||
        f.id.includes('H1') ||
        f.id.includes('HEADING') ||
        f.id.includes('THIN') ||
        f.id.includes('DIRECT_ANSWER')
      );
    }
    if (config.scope === 'schema_only') {
      return (f.category as string) === 'structured_data' || (f.category as string) === 'schema' || f.id.includes('SCHEMA');
    }
    return true; // 'all'
  });

  const prioritized: PrioritizedFinding[] = filtered.map((finding) => {
    let impactScore = 5;
    if (finding.severity === 'critical') impactScore = 9;
    else if (finding.severity === 'high' || (finding.severity as any) === 'warning') impactScore = 6;
    else impactScore = 3;

    // High impact topics in modern search
    if (finding.id.includes('TITLE_MISSING') || finding.id.includes('INDEXABLE')) {
      impactScore = 10;
    } else if (finding.id.includes('SCHEMA_ORG_MISSING') || finding.id.includes('SCHEMA_PRODUCT')) {
      impactScore = 8;
    } else if (finding.id.includes('GEO_DIRECT_ANSWER') || finding.id.includes('AEO_QUESTION')) {
      impactScore = 8;
    }

    let effortScore = 3;
    let effortLevel: 'S' | 'M' | 'L' = 'S';
    if (
      finding.effort === 'complex' ||
      (finding.effort as any) === 'high' ||
      finding.id.includes('SITEWIDE') ||
      finding.id.includes('RENDER')
    ) {
      effortScore = 8;
      effortLevel = 'L';
    } else if (
      finding.effort === 'moderate' ||
      (finding.effort as any) === 'medium' ||
      finding.id.includes('CONTENT_GAP')
    ) {
      effortScore = 5;
      effortLevel = 'M';
    }

    const confidenceScore = 9; // Audit has verified empirical evidence
    const priorityScore = parseFloat(((impactScore * confidenceScore) / effortScore).toFixed(1));

    let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
    if (impactScore >= 9 && effortScore <= 5) priority = 'P0';
    else if (impactScore >= 7) priority = 'P1';
    else if (impactScore <= 3) priority = 'P3';

    let owner: 'content' | 'dev' | 'seo' = 'seo';
    if (
      (finding.category as string) === 'structured_data' ||
      (finding.category as string) === 'schema' ||
      finding.category === 'technical'
    )
      owner = 'dev';
    else if (finding.category === 'content' || finding.id.includes('DIRECT_ANSWER')) owner = 'content';

    const targetUrl = (finding as any).affectedUrl || (finding as any).affectedUrls?.[0] || '';
    const targetPage = pageMap.get(targetUrl);

    return {
      finding,
      targetPage,
      impactScore,
      confidenceScore,
      effortScore,
      priorityScore,
      priority,
      effortLevel,
      owner,
    };
  });

  // Sort descending by priorityScore
  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
}
