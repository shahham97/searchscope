import { Finding, RoadmapItem } from '../../types/audit';

export function buildPrioritizedRoadmap(findings: Finding[]): RoadmapItem[] {
  const roadmap: RoadmapItem[] = [];

  // Group findings by category and severity
  const criticalAndHigh = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const mediumAndLow = findings.filter((f) => f.severity === 'medium' || f.severity === 'low');

  let itemIndex = 1;

  // Phase 1: Immediate Technical Fixes
  const techItems = criticalAndHigh.filter((f) => f.category === 'technical');
  for (const f of techItems) {
    roadmap.push({
      id: `ROADMAP-${itemIndex++}`,
      phase: 'immediate_technical',
      title: f.title,
      description: f.recommendedFix,
      affectedUrls: [f.affectedUrl],
      impact: 'critical',
      effort: f.effort,
      codeSnippet: f.implementationExample
        ? {
            language: f.implementationExample.includes('<') ? 'html' : 'text',
            code: f.implementationExample,
            caption: 'Recommended Implementation Snippet',
          }
        : undefined,
      validationCheck: f.validationInstructions,
    });
  }

  // Phase 2: High Priority On-Page Fixes
  const onpageItems = criticalAndHigh.filter((f) => f.category === 'onpage');
  for (const f of onpageItems) {
    roadmap.push({
      id: `ROADMAP-${itemIndex++}`,
      phase: 'high_priority_onpage',
      title: f.title,
      description: f.recommendedFix,
      affectedUrls: [f.affectedUrl],
      impact: 'high',
      effort: f.effort,
      codeSnippet: f.implementationExample
        ? {
            language: 'html',
            code: f.implementationExample,
            caption: 'Recommended HTML Implementation',
          }
        : undefined,
      validationCheck: f.validationInstructions,
    });
  }

  // Phase 3: Structured Data & Knowledge Graph
  const schemaItems = findings.filter((f) => f.category === 'structured_data');
  for (const f of schemaItems) {
    roadmap.push({
      id: `ROADMAP-${itemIndex++}`,
      phase: 'aeo_geo_optimization',
      title: f.title,
      description: f.recommendedFix,
      affectedUrls: [f.affectedUrl],
      impact: f.severity === 'critical' || f.severity === 'high' ? 'high' : 'medium',
      effort: f.effort,
      codeSnippet: f.implementationExample
        ? {
            language: 'json',
            code: f.implementationExample,
            caption: 'JSON-LD Schema Markup',
          }
        : undefined,
      validationCheck: f.validationInstructions,
    });
  }

  // Phase 4: Content Depth & Trust Signals
  const contentItems = findings.filter((f) => f.category === 'content');
  for (const f of contentItems) {
    roadmap.push({
      id: `ROADMAP-${itemIndex++}`,
      phase: 'content_expansion',
      title: f.title,
      description: f.recommendedFix,
      affectedUrls: [f.affectedUrl],
      impact: 'medium',
      effort: f.effort,
      codeSnippet: f.implementationExample
        ? {
            language: 'html',
            code: f.implementationExample,
            caption: 'Content Structure Example',
          }
        : undefined,
      validationCheck: f.validationInstructions,
    });
  }

  // Phase 5: AEO and GEO Optimization
  const aeoGeoItems = findings.filter((f) => f.category === 'aeo' || f.category === 'geo');
  for (const f of aeoGeoItems) {
    roadmap.push({
      id: `ROADMAP-${itemIndex++}`,
      phase: 'aeo_geo_optimization',
      title: f.title,
      description: f.recommendedFix,
      affectedUrls: [f.affectedUrl],
      impact: 'medium',
      effort: f.effort,
      codeSnippet: f.implementationExample
        ? {
            language: 'markdown',
            code: f.implementationExample,
            caption: 'Optimization Specification',
          }
        : undefined,
      validationCheck: f.validationInstructions,
    });
  }

  // Phase 6: Long Term Strategy & Continuous Monitoring
  roadmap.push({
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

  return roadmap;
}
