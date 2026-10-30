import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeGeo(pages: ExtractedPageData[], llmsTxtPresent: boolean): Finding[] {
  const findings: Finding[] = [];

  // 1. llms.txt observation
  if (!llmsTxtPresent) {
    let geoDomain = 'Domain';
    try {
      if (pages[0]?.url) {
        const toParse = /^https?:\/\//i.test(pages[0].url) ? pages[0].url : `https://${pages[0].url}`;
        geoDomain = new URL(toParse).hostname || 'Domain';
      }
    } catch {
      geoDomain = 'Domain';
    }

    findings.push({
      id: 'GEO-LLMS-TXT-ABSENT',
      category: 'geo',
      severity: 'informational',
      title: 'llms.txt not detected (Emerging Generative Engine standard)',
      evidence: 'No /llms.txt file was found at the root of the domain.',
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'llms.txt is an emerging proposal providing large language models and generative AI agents with a curated, concise markdown map of your website documentation and offerings. (Note: This is an emerging convention, not a mandatory search engine requirement).',
      confidence: 'high',
      recommendedFix: 'Consider adding a lightweight /llms.txt file at your domain root summarizing your core offerings, documentation URLs, and canonical entity definitions.',
      implementationExample: `# ${geoDomain}\n\n> Summary of primary services and developer resources.\n\n- [Documentation](/docs): Core architecture guide\n- [API Reference](/api): Endpoints and schemas\n- [About](/about): Company overview and mission`,
      effort: 'quick_win',
      validationInstructions: 'Confirm https://yourdomain.com/llms.txt returns 200 with text/markdown.',
    });
  } else {
    findings.push({
      id: 'GEO-LLMS-TXT-FOUND',
      category: 'geo',
      severity: 'informational',
      title: 'llms.txt detected at domain root',
      evidence: 'Domain publishes an /llms.txt file providing structured context for LLMs.',
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'Publishing an llms.txt file facilitates accurate ingestion and citation of your site structure by generative engines and AI agents.',
      confidence: 'high',
      recommendedFix: 'Keep your llms.txt updated whenever major content sections, documentation, or product offerings change.',
      effort: 'quick_win',
      validationInstructions: 'Periodically review /llms.txt for broken links or outdated summaries.',
    });
  }

  // 2. Entity Disambiguation across pages
  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    // Check if page defines its subject entity clearly in the opening paragraphs
    if (page.wordCount > 300 && !page.hasDirectDefinitions) {
      findings.push({
        id: `GEO-ENTITY-CLARITY-${page.normalizedUrl}`,
        category: 'geo',
        severity: 'low',
        title: 'Opening copy lacks explicit entity definitions for LLM parsing',
        evidence: 'The first 2,000 characters of the page do not contain direct conceptual definitions (e.g. "[Entity] is...", "[Topic] refers to...").',
        affectedUrl: page.url,
        whyItMatters:
          'Generative engines construct knowledge representations using entity-attribute-value triples. Explicit definitions in introductory text increase the probability of direct citation in AI answers.',
        confidence: 'medium',
        recommendedFix:
          'State the subject entity, category, and defining characteristics clearly in the first paragraph before delving into marketing narrative.',
        implementationExample: '<p><strong>[Product/Service Name]</strong> is a [category] that enables [target audience] to [primary benefit] by [key mechanism].</p>',
        effort: 'quick_win',
        validationInstructions: 'Read the introductory paragraph and check for clear definition statement.',
      });
    }
  }

  return findings;
}
