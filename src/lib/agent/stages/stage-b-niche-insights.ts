import { CrawledPage } from '@/types/audit';
import { AgentConfig, NicheInsights, SiteProfile } from '../types';
import { redactPII, sanitizePromptInput } from '../redaction';
import { STAGE_B_NICHE_PROMPT } from '../prompts/system-prompts';
import { LLMCallFn } from './stage-a-site-profile';
import { LLMMessage } from '../providers/llm-provider';

export async function runStageBNicheInsights(
  siteProfile: SiteProfile,
  pages: CrawledPage[],
  config: AgentConfig,
  callLLM: LLMCallFn
): Promise<NicheInsights> {
  const pageTitles: string[] = pages
    .map((p) => p.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 15);
  const existingQuestions = pages
    .flatMap((p) =>
      ((p as any).h2s || (p as any).headings?.h2 || []).concat(
        (p as any).h3s || (p as any).headings?.h3 || []
      )
    )
    .filter((h: string) => h.includes('?') || /^(what|how|why|where|can|which)/i.test(h))
    .slice(0, 10);

  const context = JSON.stringify({
    niche: siteProfile.niche,
    subNiche: siteProfile.subNiche,
    products: siteProfile.productsAndServices,
    existingPageTitles: pageTitles,
    existingQuestions,
  });

  const sanitized = redactPII(sanitizePromptInput(context));

  const messages: LLMMessage[] = [
    { role: 'system', content: STAGE_B_NICHE_PROMPT },
    {
      role: 'user',
      content: `Analyze this niche context and return NicheInsights JSON:\n${sanitized}`,
    },
  ];

  try {
    const res = await callLLM(messages, { jsonMode: true, temperature: 0.3 });
    const cleaned = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const topicClusters = (parsed.primaryKeywords || []).map((term: string, idx: number) => ({
      clusterName: term,
      intent: idx % 2 === 0 ? ('commercial' as const) : ('informational' as const),
      coreTerms: [term, `${term} review`, `best ${term}`, `how to choose ${term}`],
      missingFromSite: !pageTitles.some((t) => t.toLowerCase().includes(term.toLowerCase())),
    }));

    const contentGaps = (parsed.contentGaps || []).map((gap: string) => ({
      topic: gap,
      whyNeeded: `Fulfills informational intent for target audience searching about ${siteProfile.niche}.`,
      suggestedFormat: 'article' as const,
    }));

    const commonQuestions = (parsed.questionIntents || []).map((q: string) => ({
      question: q,
      source: 'inferred_industry' as const,
    }));

    return {
      topicClusters: topicClusters.length > 0 ? topicClusters : [
        {
          clusterName: `${siteProfile.niche} Guide`,
          intent: 'informational',
          coreTerms: [`${siteProfile.niche} care`, `${siteProfile.niche} selection`],
          missingFromSite: false,
        },
      ],
      contentGaps: contentGaps.length > 0 ? contentGaps : [
        {
          topic: `Complete Buyer's Guide to ${siteProfile.niche}`,
          whyNeeded: 'Builds topical authority and answers common pre-purchase questions.',
          suggestedFormat: 'guide',
        },
      ],
      commonQuestions: commonQuestions.length > 0 ? commonQuestions : [
        {
          question: `How do I select the best ${siteProfile.niche} for my needs?`,
          source: 'inferred_industry',
        },
        {
          question: `What makes artisanal ${siteProfile.niche} different from mass-market alternatives?`,
          source: 'inferred_industry',
        },
      ],
      serpOpportunities: parsed.searchEngineCompetitorPatterns || [
        'Direct Answer Paragraphs (40-60 words) targeting question queries',
        'FAQPage Schema with structured Q&A for Rich Results',
        'Product Schema with priceValidUntil and verified inStock availability',
      ],
      terminologyAndSynonyms: (parsed.semanticEntities || []).map((entity: string) => ({
        term: entity,
        synonyms: [`Handcrafted ${entity}`, `Signature ${entity}`],
      })),
    };
  } catch (err) {
    // Deterministic fallback
    return {
      topicClusters: [
        {
          clusterName: siteProfile.niche,
          intent: 'commercial',
          coreTerms: [siteProfile.niche, `luxury ${siteProfile.niche}`],
          missingFromSite: false,
        },
      ],
      contentGaps: [
        {
          topic: `Comparison: Artisanal vs Commercial ${siteProfile.niche}`,
          whyNeeded: 'Answers comparative search intent for high-intent buyers.',
          suggestedFormat: 'comparison',
        },
      ],
      commonQuestions: [
        {
          question: `What ingredients or materials are used in ${siteProfile.niche}?`,
          source: 'inferred_industry',
        },
      ],
      serpOpportunities: ['FAQPage Schema', 'Direct answer summaries at top of product guides'],
      terminologyAndSynonyms: [
        { term: siteProfile.niche, synonyms: ['Artisanal formulation', 'Signature line'] },
      ],
    };
  }
}
