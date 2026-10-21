import { LLMProvider, LLMMessage, LLMCallOptions, LLMResponse } from './llm-provider';

export class MockProvider implements LLMProvider {
  type = 'mock' as const;

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Mock offline test provider active.' };
  }

  async call(
    messages: LLMMessage[],
    options: LLMCallOptions = {}
  ): Promise<LLMResponse> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';

    // Check which stage is being requested from the prompt
    let responseText = '{}';

    if (lastUserMessage.includes('SITE_PROFILE_EXTRACTION')) {
      responseText = JSON.stringify({
        businessType: 'E-commerce Luxury Fragrance Brand',
        niche: 'Luxury Alcohol-Free Perfume Oils',
        subNiche: 'Pure Attars, Car Diffusers & Artisan Botanical Scents',
        productsAndServices: [
          'Pure Perfume Oils',
          'Luxury Car Diffusers',
          'Sample Discovery Boxes',
          'Artisan Botanical Attars',
        ],
        targetAudience: [
          {
            personaName: 'Luxury Fragrance Enthusiast',
            description: 'Conscious shoppers seeking long-lasting, alcohol-free artisanal scents.',
            searchIntent: 'Commercial & Transactional search for pure perfume oils and diffusers.',
          },
        ],
        geography: {
          primaryCountry: 'Australia',
          regionsServed: ['Australia', 'Global'],
          languages: ['en'],
          currency: 'AUD',
        },
        pricePositioning: 'luxury_premium',
        brandVoice: {
          tone: 'Sophisticated, artisanal, evocative, and benefit-focused',
          formality: 'approachable_expert',
          vocabularyDo: ['botanical', 'pure oils', 'handcrafted', 'alcohol-free', 'enduring'],
          vocabularyDont: ['cheap', 'discount', 'bargain', 'miracle', 'guaranteed'],
        },
        verifiedUSPs: [
          '100% alcohol-free concentrated perfume oils',
          'Longer lasting projection than traditional alcohol sprays',
          'Hand-blended with premium ingredients',
        ],
        trustSignalsPresent: ['About Us page', 'Clear shipping & returns policies', 'Secure checkout'],
        trustSignalsMissing: ['Author bylines on perfume education guides', 'Direct contact phone'],
        contentMaturity: 'growing',
      });
    } else if (lastUserMessage.includes('NICHE_INSIGHTS_EXTRACTION')) {
      responseText = JSON.stringify({
        topicClusters: [
          {
            clusterName: 'Alcohol-Free Perfume Oils',
            intent: 'transactional',
            coreTerms: ['perfume oils', 'alcohol free perfume', 'pure attar oils'],
            missingFromSite: false,
          },
          {
            clusterName: 'Luxury Car Diffusers',
            intent: 'commercial',
            coreTerms: ['car fresheners', 'car scent diffuser', 'luxury car fragrances'],
            missingFromSite: false,
          },
        ],
        contentGaps: [
          {
            topic: 'How to Apply and Care for Pure Perfume Oils',
            whyNeeded: 'Educates first-time buyers on roll-on pulse-point application for maximum longevity.',
            suggestedFormat: 'article',
          },
        ],
        commonQuestions: [
          {
            question: 'How long do alcohol-free perfume oils last on the skin?',
            source: 'inferred_industry',
            suggestedTargetUrl: 'https://kingshyer.com/shop',
          },
        ],
        serpOpportunities: ['FAQ Schema snippet for perfume oil longevity and application steps'],
        terminologyAndSynonyms: [
          { term: 'perfume oil', synonyms: ['attar', 'fragrance oil', 'scented oil'] },
        ],
      });
    } else if (lastUserMessage.includes('CONTENT_GENERATION_TASK')) {
      responseText = JSON.stringify({
        proposedTitle: 'Kingshyer — Luxury Alcohol-Free Perfume Oils & Scents | Australia',
        proposedDescription:
          'Discover luxury alcohol-free perfume oils and artisan car diffusers crafted in Australia. Long-lasting, concentrated scents hand-blended with pure botanicals.',
        titleAlternatives: [
          'Artisan Perfume Oils & Luxury Diffusers | Kingshyer Australia',
          'Kingshyer: Pure Concentrated Fragrance Oils & Scents',
        ],
        descriptionAlternatives: [
          'Shop premium alcohol-free perfume oils and botanical car diffusers with free Australian shipping on qualifying orders.',
        ],
        proposedH1: 'Luxury Alcohol-Free Perfume Oils Handcrafted in Australia',
        headingRestructure: [
          'How Are Kingshyer Perfume Oils Created?',
          'What Makes Alcohol-Free Fragrance Last Longer?',
        ],
        directAnswerSnippet:
          'Kingshyer perfume oils are 100% alcohol-free concentrated fragrances hand-blended in Australia. Because they contain no evaporating ethanol, the pure botanical oils absorb into the skin and release fragrance gradually for 8 to 12 hours.',
        faqBlocks: [
          {
            question: 'What is the benefit of alcohol-free perfume oils?',
            answer:
              'Alcohol-free perfume oils eliminate skin irritation from drying ethanol and provide longer-lasting longevity, clinging gently to pulse points throughout the day.',
          },
        ],
        rationale:
          'Optimized for search intent and brand voice while embedding core transactional terms into title and description within strict pixel boundaries.',
        factsNeeded: [],
      });
    } else if (lastUserMessage.includes('QA_GUARDRAIL_CHECK')) {
      responseText = JSON.stringify({
        passed: true,
        bannedClaimsFound: [],
        unsupportedClaimsFound: [],
        readabilityScore: 72,
        revisedContent: null,
      });
    } else {
      responseText = JSON.stringify({ message: 'Success' });
    }

    return {
      content: responseText,
      tokensUsed: { prompt: 100, completion: 200, total: 300 },
      model: 'searchscope-mock-engine-v1',
      provider: this.type,
    };
  }
}
