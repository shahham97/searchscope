import { Finding, RoadmapItem, Severity } from '../../types/audit';
import { extractRuleFamily } from './scoring';

export function buildPrioritizedRoadmap(findings: Finding[]): RoadmapItem[] {
  // 1. Group duplicate findings by rule family so identical issues across N pages become 1 task
  const groups = new Map<
    string,
    {
      family: string;
      sampleFinding: Finding;
      affectedUrls: Set<string>;
      highestSeverity: Severity;
    }
  >();

  for (const f of findings) {
    const family = extractRuleFamily(f.id);
    let group = groups.get(family);
    if (!group) {
      group = {
        family,
        sampleFinding: f,
        affectedUrls: new Set<string>(),
        highestSeverity: f.severity,
      };
      groups.set(family, group);
    }
    group.affectedUrls.add(f.affectedUrl);
    if (f.severity === 'critical') {
      group.highestSeverity = 'critical';
    } else if (f.severity === 'high' && group.highestSeverity !== 'critical') {
      group.highestSeverity = 'high';
    } else if (f.severity === 'medium' && group.highestSeverity === 'low') {
      group.highestSeverity = 'medium';
    }
  }

  // 2. Map groups into structured Roadmap Items with unified titles and full affectedUrls
  const rawItems: RoadmapItem[] = [];
  let itemIndex = 1;

  for (const [, group] of groups) {
    const f = group.sampleFinding;
    const urlCount = group.affectedUrls.size;
    const urls = Array.from(group.affectedUrls);

    // Create a unified task title if multiple URLs are affected
    let title = f.title;
    if (urlCount > 1) {
      const cleanBaseTitle = f.title
        .replace(/:\s*".*?"$/, '')
        .replace(/on https?:\/\/\S+/i, '')
        .trim();
      title = `${cleanBaseTitle} (affects ${urlCount} pages)`;
    }

    // Determine strict phase:
    // Phase 1: Technical blockers or Critical severity
    // Phase 2: High-Priority On-Page & Schema fixes
    // Phase 3: Content depth, EEAT, and typos
    // Phase 4: AEO & GEO machine readability
    // Phase 5: Long-term strategy & continuous monitoring
    let phase: RoadmapItem['phase'];
    if (f.category === 'technical' || group.highestSeverity === 'critical') {
      phase = 'immediate_technical';
    } else if (f.category === 'onpage' || f.category === 'structured_data') {
      phase = 'high_priority_onpage';
    } else if (f.category === 'content') {
      phase = 'content_expansion';
    } else if (f.category === 'aeo' || f.category === 'geo') {
      phase = 'aeo_geo_optimization';
    } else {
      phase = 'long_term_strategy';
    }

    const impact: 'critical' | 'high' | 'medium' =
      group.highestSeverity === 'critical'
        ? 'critical'
        : group.highestSeverity === 'high'
        ? 'high'
        : 'medium';

    rawItems.push({
      id: `ROADMAP-${itemIndex++}`,
      phase,
      title,
      description: f.recommendedFix,
      affectedUrls: urls,
      impact,
      effort: f.effort,
      codeSnippet: f.implementationExample
        ? {
            language: f.implementationExample.startsWith('{')
              ? 'json'
              : f.implementationExample.includes('<')
              ? 'html'
              : 'text',
            code: f.implementationExample,
            caption: 'Recommended Implementation Snippet',
          }
        : undefined,
      validationCheck: f.validationInstructions,
    });
  }

  // Always include Phase 5 continuous monitoring recommendation
  rawItems.push({
    id: `ROADMAP-${itemIndex++}`,
    phase: 'long_term_strategy',
    title: 'Connect Google Search Console & Monitor Real User Web Vitals',
    description:
      'Set up domain property verification in Google Search Console and Bing Webmaster Tools to inspect real-world search impressions, click-through rates, and Core Web Vitals field data (LCP, INP, CLS).',
    affectedUrls: ['Entire Domain'],
    impact: 'medium',
    effort: 'moderate',
    validationCheck: 'Verify property ownership in search.google.com/search-console.',
  });

  // 3. Strict ordering by Phase: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5
  const phaseOrder: Record<RoadmapItem['phase'], number> = {
    immediate_technical: 1,
    high_priority_onpage: 2,
    content_expansion: 3,
    aeo_geo_optimization: 4,
    long_term_strategy: 5,
  };

  const severityOrder: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
  };

  return rawItems.sort((a, b) => {
    const pDiff = phaseOrder[a.phase] - phaseOrder[b.phase];
    if (pDiff !== 0) return pDiff;
    return severityOrder[a.impact] - severityOrder[b.impact];
  });
}
