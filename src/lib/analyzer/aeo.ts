import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeAeo(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  let pagesWithQna = 0;
  let pagesWithTablesOrLists = 0;
  let pagesWithDefinitions = 0;

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    if (page.hasFAQMarkupOrContent) pagesWithQna++;
    if (page.hasTablesOrLists) pagesWithTablesOrLists++;
    if (page.hasDirectDefinitions) pagesWithDefinitions++;

    // Check if page has question-oriented headings
    const questionHeadings = [...page.h2s, ...page.h3s].filter((h) =>
      /^(what|how|why|when|where|who|which|can|does|is|are)\b/i.test(h.trim()) || h.trim().endsWith('?')
    );

    if (page.wordCount > 400 && questionHeadings.length === 0) {
      findings.push({
        id: `AEO-NO-QUESTION-HEADINGS-${page.normalizedUrl}`,
        category: 'aeo',
        severity: 'low',
        title: 'Content lacks question-oriented subheadings for Answer Engine extraction',
        evidence: `Page has ${page.h2s.length} H2s and ${page.h3s.length} H3s, but none are framed as direct questions that users ask answer engines.`,
        affectedUrl: page.url,
        whyItMatters:
          'Answer engines (Google AI Overviews, Perplexity, Siri, Copilot) frequently extract content sections that match conversational natural-language question formats.',
        confidence: 'medium',
        recommendedFix:
          'Transform generic subheadings into natural query phrases that users type or speak (e.g., change "Pricing" to "How Much Does It Cost?", "Integration" to "How Do You Integrate SearchScope?").',
        implementationExample: `<h2>How does [Topic] work?</h2>\n<p>[Direct 1-2 sentence definition], followed by detailed explanation.</p>`,
        effort: 'quick_win',
        validationInstructions: 'Confirm at least one H2 is phrased as a clear conversational question.',
      });
    }

    // Check for structured tables or lists in data-rich content
    if (page.wordCount > 500 && !page.hasTablesOrLists) {
      findings.push({
        id: `AEO-NO-TABLES-OR-LISTS-${page.normalizedUrl}`,
        category: 'aeo',
        severity: 'low',
        title: 'Long-form content lacks structured tables or bullet lists',
        evidence: 'Page contains extensive paragraph copy without HTML lists (<ul>, <ol>) or comparison tables (<table>).',
        affectedUrl: page.url,
        whyItMatters:
          'Answer engines heavily prioritize structured data formats like bulleted steps and tables when synthesizing direct answers and featured snippets.',
        confidence: 'high',
        recommendedFix: 'Structure key takeaways, feature comparisons, and sequential procedures into concise lists and tables.',
        effort: 'quick_win',
        validationInstructions: 'Verify HTML contains <ul>, <ol>, or <table> elements with clear headers.',
      });
    }
  }

  // Domain-wide AEO evaluation
  if (pagesWithQna === 0 && pages.length >= 2) {
    findings.push({
      id: 'AEO-NO-FAQ-OR-QA',
      category: 'aeo',
      severity: 'medium',
      title: 'No FAQ or Q&A content detected across audited pages',
      evidence: 'Zero pages contained FAQ sections, Accordion Q&A elements, or FAQPage structured data.',
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'FAQ blocks directly address high-intent user questions and provide answer engines with pre-formatted question-and-answer pairs suitable for citations.',
      confidence: 'medium',
      recommendedFix: 'Add dedicated FAQ sections to core landing and service pages with Schema.org FAQPage markup.',
      implementationExample: `<div class="faq-item">\n  <h3>What is the primary benefit of your solution?</h3>\n  <p>Our solution provides deterministic, privacy-first technical audits without requiring account logins or AI API subscriptions.</p>\n</div>`,
      effort: 'moderate',
      validationInstructions: 'Verify FAQ section renders on key pages.',
    });
  }

  return findings;
}
