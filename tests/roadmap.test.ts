import { describe, it, expect } from 'vitest';
import { buildPrioritizedRoadmap } from '../src/lib/analyzer/roadmap';
import { Finding } from '../src/types/audit';

describe('Prioritized Roadmap Generator', () => {
  it('organizes findings into structured phases with code snippets', () => {
    const findings: Finding[] = [
      {
        id: 'TECH-1',
        category: 'technical',
        severity: 'critical',
        title: 'Insecure HTTP Protocol',
        evidence: 'HTTP used',
        affectedUrl: 'http://example.com',
        whyItMatters: 'Security ranking signal',
        confidence: 'high',
        recommendedFix: 'Redirect HTTP to HTTPS',
        implementationExample: 'server { return 301 https://$host$request_uri; }',
        effort: 'moderate',
        validationInstructions: 'curl -I http://example.com',
      },
      {
        id: 'SCHEMA-1',
        category: 'structured_data',
        severity: 'high',
        title: 'Missing Organization Schema',
        evidence: 'No JSON-LD',
        affectedUrl: 'https://example.com',
        whyItMatters: 'Entity clarity',
        confidence: 'high',
        recommendedFix: 'Add Organization schema',
        implementationExample: '{"@type": "Organization"}',
        effort: 'quick_win',
        validationInstructions: 'Schema Validator',
      },
    ];

    const roadmap = buildPrioritizedRoadmap(findings);

    expect(roadmap.length).toBeGreaterThanOrEqual(2);
    expect(roadmap.some((r) => r.phase === 'immediate_technical')).toBe(true);
    expect(roadmap.some((r) => r.phase === 'long_term_strategy')).toBe(true);

    const techItem = roadmap.find((r) => r.title === 'Insecure HTTP Protocol');
    expect(techItem?.codeSnippet?.code).toContain('301 https');
  });
});
