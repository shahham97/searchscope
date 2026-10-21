export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type Category = 
  | 'technical' 
  | 'onpage' 
  | 'content' 
  | 'structured_data' 
  | 'aeo' 
  | 'geo' 
  | 'performance' 
  | 'search_intel';

export type EffortLevel = 'quick_win' | 'moderate' | 'complex';

export type FailureCode =
  | 'DNS_FAILURE'
  | 'TLS_ERROR'
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'SSRF_BLOCKED'
  | 'ROBOTS_BLOCKED'
  | 'WAF_CHALLENGE'
  | 'HTTP_4XX'
  | 'HTTP_5XX'
  | 'REDIRECT_LOOP'
  | 'CONTENT_TYPE_UNSUPPORTED'
  | 'BODY_TOO_LARGE';

export interface CrawlDiagnostic {
  url: string;
  code: FailureCode;
  statusCode?: number;
  message: string;
  hint: string;
  stage: 'dns' | 'tls' | 'connect' | 'response' | 'redirect' | 'policy';
  timestamp: string;
}

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  evidence: string;
  affectedUrl: string;
  whyItMatters: string;
  confidence: 'high' | 'medium' | 'low';
  recommendedFix: string;
  implementationExample?: string;
  effort: EffortLevel;
  dependencies?: string[];
  validationInstructions: string;
}

export interface StructuredDataItem {
  type: string;
  rawJson: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  propertiesFound: string[];
}

export type CrawledPage = ExtractedPageData;

export interface ExtractedPageData {
  url: string;
  normalizedUrl: string;
  statusCode: number;
  statusText: string;
  fetchDurationMs: number;
  contentType: string;
  contentLengthBytes: number;
  isHtml: boolean;
  
  // Failure taxonomy
  failureCode?: FailureCode;
  failureHint?: string;

  // SEO Metadata
  title?: string;
  titleLength: number;
  metaDescription?: string;
  metaDescriptionLength: number;
  canonicalUrl?: string;
  robotsDirectives: string[];
  lang?: string;
  viewport?: string;
  charset?: string;

  // OpenGraph & Twitter
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogImageAlt?: string;
  twitterImage?: string;

  // Canonical & Hreflang Diagnostics
  hasCanonicalInBody?: boolean;
  multipleCanonicalsCount?: number;
  hreflangTargets?: { lang: string; href: string }[];
  redirectChain?: string[];
  redirectStatusCodes?: number[];

  // Headings
  h1s: string[];
  h2s: string[];
  h3s: string[];
  rawH1s?: string[];
  renderedH1s?: string[];
  isH1OnlyInJs?: boolean;
  emptyH1Count?: number;
  isH1InCarousel?: boolean;
  isH1Hidden?: boolean;
  h1HiddenReason?: string;
  headingHierarchyValid: boolean;
  headingIssues: string[];

  // Links
  internalLinks: { url: string; anchorText: string }[];
  externalLinks: { url: string; anchorText: string }[];
  brokenInternalLinks: string[];

  // Media
  images: {
    src: string;
    alt?: string;
    hasAlt: boolean;
    isLazy: boolean;
    hasExplicitDimensions: boolean;
  }[];

  // Content Analysis
  wordCount: number;
  textSnippet: string;
  detectedEntities: string[];
  fleschKincaidReadingEase?: number;
  hasFAQMarkupOrContent: boolean;
  hasDirectDefinitions: boolean;
  hasTablesOrLists: boolean;
  hasAuthorAttribution: boolean;
  hasContactOrAboutEvidence: boolean;
  llmsTxtDetected?: boolean;

  // Structured Data
  structuredData: StructuredDataItem[];

  // Performance signals
  isHttps: boolean;
  hasCompression: boolean;
  cacheControl?: string;
  renderBlockingResourceCount: number;
  domElementCount: number;

  // Tier 2 Headless Rendering Comparison
  isJsRendered?: boolean;
  rawVsRenderedDiff?: {
    rawWordCount: number;
    renderedWordCount: number;
    wordCountDiff: number;
    headingsDiff: number;
    linksDiff: number;
    schemaDiff: number;
    dependsOnJs: boolean;
  };

  // Error details
  error?: string;
}

export interface KeywordCandidate {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational' | 'local';
  sourceUrls: string[];
  occurrenceCount: number;
  inTitleCount: number;
  inHeadingCount: number;
  inMetaCount?: number;
  inBodyOnly?: boolean; // Flagged keyword gap
  tfIdfScore?: number;
}

export interface PublicSearchObservation {
  query: string;
  searchSource: string;
  locale?: string;
  observationTime: string;
  observedPosition?: number;
  resultUrl?: string;
  sourceStatus: 'observed' | 'unavailable' | 'rate_limited' | 'mock_fixture';
  notes: string;
}

export interface CompetitorComparison {
  domain: string;
  observedSource: string;
  topicOverlap: string[];
  notableStrengths: string[];
  notableGaps: string[];
  notes: string;
}

export interface CategoryScore {
  category: Category;
  label: string;
  score: number; // 0 to 100
  weight: number;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
}

export interface CrawlStatistics {
  totalPagesDiscovered: number;
  totalPagesCrawled: number;
  totalPagesSkipped: number;
  totalPagesFailed: number;
  successfulPagesCount: number;
  crawlDurationMs: number;
  robotsTxtPresent: boolean;
  sitemapDetected: boolean;
  sitemapsFound: string[];
  llmsTxtPresent: boolean;
  crawlBudgetExhausted: boolean;
  aiBotsAudit?: {
    bot: string;
    allowed: boolean;
    ruleSnippet?: string;
  }[];
}

export interface AuditConfig {
  targetUrl: string;
  auditDepth: 'quick' | 'standard' | 'deep';
  maxPages: number;
  includeContentAnalysis: boolean;
  includeAeoGeo: boolean;
  includeStructuredData: boolean;
  checkBrokenLinks: boolean;
  searchDiscoveryEnabled: boolean;
  userAgentType?: 'browser' | 'bot';
  respectRobotsTxt?: boolean;
  enableHeadlessRendering?: boolean;
}

export interface AuditReport {
  id: string;
  auditDate: string;
  targetDomain: string;
  targetNormalizedUrl: string;
  siteTitle?: string;
  organizationName?: string;
  faviconUrl?: string;
  config: AuditConfig;
  crawlerUserAgent: string;
  
  overallScore: number;
  isCrawlFailed: boolean;
  crawlFailureReason?: string;
  diagnostics: CrawlDiagnostic[];

  categoryScores: CategoryScore[];
  crawlStats: CrawlStatistics;

  pages: ExtractedPageData[];
  findings: Finding[];
  keywordCandidates: KeywordCandidate[];
  searchObservations: PublicSearchObservation[];
  competitors: CompetitorComparison[];

  roadMap: RoadmapItem[];
  methodology: string;
  disclaimers: string[];
}

export interface RoadmapItem {
  id: string;
  phase: 'immediate_technical' | 'high_priority_onpage' | 'content_expansion' | 'aeo_geo_optimization' | 'long_term_strategy';
  title: string;
  description: string;
  affectedUrls: string[];
  impact: 'critical' | 'high' | 'medium';
  effort: EffortLevel;
  codeSnippet?: {
    language: string;
    code: string;
    caption: string;
  };
  validationCheck: string;
}
