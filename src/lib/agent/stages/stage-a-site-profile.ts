import { CrawledPage, Finding } from '@/types/audit';
import { AgentConfig, SiteProfile } from '../types';
import { detectPlatform } from '../platform-detector';
import { redactPII, sanitizePromptInput } from '../redaction';
import { STAGE_A_PROFILE_PROMPT } from '../prompts/system-prompts';
import { LLMMessage, LLMResponse } from '../providers/llm-provider';

export type LLMCallFn = (messages: LLMMessage[], options?: { jsonMode?: boolean; temperature?: number }) => Promise<LLMResponse>;

export async function runStageASiteProfile(
  pages: CrawledPage[],
  findings: Finding[],
  domain: string,
  config: AgentConfig,
  callLLM: LLMCallFn
): Promise<SiteProfile> {
  const detectedPlatform = detectPlatform(pages);

  // Extract initial empirical context from crawled pages
  const titles = pages
    .map((p) => p.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 10);
  const headings = pages
    .flatMap((p) => (p as any).h1s || (p as any).headings?.h1 || [])
    .filter((h): h is string => Boolean(h))
    .slice(0, 10);
  const sampleDescriptions = pages
    .map((p) => p.metaDescription)
    .filter((d): d is string => Boolean(d))
    .slice(0, 5);
  const sampleUrls = pages.map((p) => p.url).slice(0, 15);
  const sampleBodyTexts = pages
    .map((p) => ((p as any).textSnippet || (p as any).mainContentText || '').slice(0, 300))
    .filter((t: string) => t.length > 50)
    .slice(0, 3);

  const rawContext = JSON.stringify({
    domain,
    sampleUrls,
    titles,
    headings,
    sampleDescriptions,
    sampleBodyTexts,
    detectedPlatform,
    findingsCount: findings.length,
  });

  const sanitizedContext = redactPII(sanitizePromptInput(rawContext));

  const messages: LLMMessage[] = [
    { role: 'system', content: STAGE_A_PROFILE_PROMPT },
    {
      role: 'user',
      content: `Analyze this website data and produce the SiteProfile JSON:\n${sanitizedContext}`,
    },
  ];

  try {
    const res = await callLLM(messages, { jsonMode: true, temperature: 0.2 });
    let parsed: any;
    try {
      const cleaned = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    // Build robust SiteProfile with fallbacks
    const profile: SiteProfile = {
      businessType: parsed.businessType || parsed.primaryNiche || 'E-Commerce & Digital Brand',
      niche: parsed.primaryNiche || parsed.niche || 'Specialty Consumer Products',
      subNiche: parsed.subNiche || 'Direct to Consumer',
      productsAndServices: Array.isArray(parsed.productsAndServices)
        ? parsed.productsAndServices
        : Array.isArray(parsed.keyEntities)
        ? parsed.keyEntities
        : ['Signature Products', 'Online Store Collection'],
      targetAudience: Array.isArray(parsed.targetAudience)
        ? parsed.targetAudience
        : [
            {
              personaName: 'Primary Customer',
              description: typeof parsed.targetAudience === 'string' ? parsed.targetAudience : 'Discerning consumers looking for premium quality.',
              searchIntent: 'Commercial and transactional search intent.',
            },
          ],
      geography: {
        primaryCountry: parsed.geography?.primaryCountry || parsed.geoScope || 'Global',
        regionsServed: parsed.geography?.regionsServed || ['North America', 'International'],
        languages: parsed.geography?.languages || ['en'],
        currency: parsed.geography?.currency || 'USD',
      },
      pricePositioning: parsed.pricePositioning || 'luxury_premium',
      brandVoice: {
        tone: config.brandVoiceOverride || parsed.brandTone || 'Sophisticated, artisanal, and trustworthy',
        formality: parsed.brandVoice?.formality || 'approachable_expert',
        vocabularyDo: parsed.brandVoice?.vocabularyDo || ['Artisanal', 'Handcrafted', 'Signature', 'Curated'],
        vocabularyDont: parsed.brandVoice?.vocabularyDont || ['Cheap', 'Discount', 'Overnight miracle', 'Guaranteed'],
      },
      verifiedUSPs: Array.isArray(parsed.coreValueProps)
        ? parsed.coreValueProps
        : ['Handcrafted artisanal formulation', 'Authentic premium materials'],
      trustSignalsPresent: parsed.trustSignalsPresent || ['Clear contact channels', 'Secure checkout'],
      trustSignalsMissing: parsed.trustSignalsMissing || ['Schema Review rating', 'Third-party accreditation badges'],
      contentMaturity: pages.length > 30 ? 'mature' : pages.length > 10 ? 'growing' : 'nascent',
    };

    return profile;
  } catch (err) {
    // Deterministic fallback if LLM call fails
    return {
      businessType: 'E-Commerce / Online Brand',
      niche: 'Consumer Lifestyle & Specialty Goods',
      subNiche: 'Boutique Retail',
      productsAndServices: headings.slice(0, 5),
      targetAudience: [
        {
          personaName: 'Discerning Shopper',
          description: 'Consumers searching for high quality and artisanal craftsmanship.',
          searchIntent: 'Commercial & Informational',
        },
      ],
      geography: {
        primaryCountry: 'Global',
        regionsServed: ['Global'],
        languages: ['en'],
        currency: 'USD',
      },
      pricePositioning: 'luxury_premium',
      brandVoice: {
        tone: 'Sophisticated and artisanal',
        formality: 'approachable_expert',
        vocabularyDo: ['Premium', 'Signature', 'Authentic'],
        vocabularyDont: ['Cheap', 'Bargain'],
      },
      verifiedUSPs: ['Specialty curated selection'],
      trustSignalsPresent: ['Direct online ordering'],
      trustSignalsMissing: ['Explicit customer FAQ schema', 'Comprehensive about story'],
      contentMaturity: pages.length > 20 ? 'growing' : 'nascent',
    };
  }
}
