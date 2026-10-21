import { z } from 'zod';
import { Category, EffortLevel, Severity } from '../../types/audit';

export type LLMProviderType =
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'anthropic'
  | 'mistral'
  | 'openai_compatible'
  | 'ollama'
  | 'mock';

export type DetectedPlatform =
  | 'nextjs_app_router'
  | 'nextjs_pages_router'
  | 'shopify'
  | 'wordpress'
  | 'woocommerce'
  | 'webflow'
  | 'wix'
  | 'custom_html';

export interface WhereToChangeLocation {
  humanReadable: string;
  detectedPlatform: DetectedPlatform;
  confidence: 'high' | 'medium' | 'low';
  platformInstruction: string;
  suggestedFilePath?: string;
  codeAnchor?: string;
  cssSelector?: string;
}

export type ChangeType =
  | 'replace'
  | 'add'
  | 'remove'
  | 'create_page'
  | 'create_file'
  | 'config'
  | 'redirect';

export interface ChangeItem {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  effort: 'S' | 'M' | 'L';
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  category: Category;
  linkedFindingIds: string[];
  targetUrl: string;
  changeType: ChangeType;
  whereToChange: WhereToChangeLocation;
  current: string;
  proposed: string;
  alternatives?: string[];
  rationale: string;
  sourceEvidence: string;
  verification: string;
  qaStatus: 'passed' | 'needs_human';
  factsNeeded: string[];
  owner: 'content' | 'dev' | 'seo';
  status: 'proposed' | 'approved' | 'rejected' | 'done';
}

export interface SiteProfile {
  businessType: string;
  niche: string;
  subNiche: string;
  productsAndServices: string[];
  targetAudience: {
    personaName: string;
    description: string;
    searchIntent: string;
  }[];
  geography: {
    primaryCountry: string;
    regionsServed: string[];
    languages: string[];
    currency: string;
  };
  pricePositioning: 'luxury_premium' | 'mid_market' | 'budget_value';
  brandVoice: {
    tone: string;
    formality: 'formal' | 'approachable_expert' | 'casual';
    vocabularyDo: string[];
    vocabularyDont: string[];
  };
  verifiedUSPs: string[];
  trustSignalsPresent: string[];
  trustSignalsMissing: string[];
  contentMaturity: 'nascent' | 'growing' | 'mature';
}

export interface NicheInsights {
  topicClusters: {
    clusterName: string;
    intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
    coreTerms: string[];
    missingFromSite: boolean;
  }[];
  contentGaps: {
    topic: string;
    whyNeeded: string;
    suggestedFormat: 'article' | 'product_guide' | 'faq' | 'comparison';
  }[];
  commonQuestions: {
    question: string;
    source: 'inferred_industry' | 'competitor_faq';
    suggestedTargetUrl?: string;
  }[];
  serpOpportunities: string[];
  terminologyAndSynonyms: { term: string; synonyms: string[] }[];
}

export interface UpdatePlan {
  siteProfile: SiteProfile;
  nicheInsights: NicheInsights;
  changes: ChangeItem[];
  siteWideChanges: {
    robotsTxt?: string;
    llmsTxt?: string;
    sitemapXml?: string;
    rootJsonLd?: string;
  };
  newContentBriefs: {
    title: string;
    intent: string;
    slug: string;
    outline: string[];
    entitiesToInclude: string[];
    targetWordCount: number;
    initialDraft?: string;
  }[];
  factsNeededFromOwner: string[];
  qaSummary: {
    totalItems: number;
    passedQa: number;
    flaggedNeedsHuman: number;
    bannedClaimsIntercepted: number;
  };
}

export interface AgentConfig {
  provider: LLMProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  competitorUrls?: string[];
  scope: 'all' | 'metadata_only' | 'content_only' | 'schema_only';
  toneStrictness: 'conservative' | 'balanced' | 'creative';
  brandVoiceOverride?: string;
  aiCrawlerPolicy: 'allow_all' | 'allow_search_only' | 'block_training';
}

export interface AgentStageLog {
  stage: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  durationMs?: number;
  tokensUsed?: number;
}
