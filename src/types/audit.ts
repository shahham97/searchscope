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

export interface ExtractedPageData {
  url: string;
  normalizedUrl: string;
  statusCode: number;
  statusText: string;
  fetchDurationMs: number;
  contentType: string;
  contentLengthBytes: number;
  isHtml: boolean;
  
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

  // Headings
  h1s: string[];
  h2s: string[];
  h3s: string[];
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
  weight: number; // e.g. 0.20
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
  crawlDurationMs: number;
  robotsTxtPresent: boolean;
  sitemapDetected: boolean;
  sitemapsFound: string[];
  llmsTxtPresent: boolean;
  crawlBudgetExhausted: boolean;
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
