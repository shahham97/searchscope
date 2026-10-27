import {
  ExtractedPageData,
  KeywordCandidate,
  PublicSearchObservation,
  CompetitorComparison,
  KeywordMap,
  KeywordMapNode,
  KeywordMapModifier,
  CannibalizationIssue,
  Finding,
} from '../../types/audit';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', "cannot", 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', "let's", 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', "won't", 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'will', 'just', 'like', 'also', 'page', 'site', 'website', 'click', 'read', 'learn', 'more', 'view',
  'home', 'com', 'http', 'https', 'www', 'one', 'two', 'new', 'get', 'use', 'using', 'see', 'all', 'now', 'back',
  'item', 'items', 'add', 'added', 'viewing', 'continue', 'terms', 'privacy', 'copyright', 'reserved', 'rights',
  'menu', 'close', 'open', 'search', 'filter', 'sort', 'login', 'signup', 'account', 'cart', 'checkout'
]);

// Accidental fluff bigrams to reject
const DISALLOWED_BIGRAM_PREFIXES = new Set(['click', 'read', 'learn', 'view', 'sign', 'log', 'back', 'skip', 'terms', 'privacy', 'all']);
const DISALLOWED_BIGRAM_SUFFIXES = new Set(['here', 'more', 'now', 'us', 'page', 'site', 'online', 'free', 'new', 'home']);

// Common intent & attribute modifiers for e-commerce and SaaS
export const COMMON_MODIFIERS = [
  'best', 'top', 'buy', 'online', 'free', 'luxury', 'organic', 'alcohol-free', 'cheap', 'affordable',
  'premium', 'custom', 'small business', 'enterprise', 'guide', 'review', 'reviews', 'vs', 'comparison',
  'handmade', 'pure', 'natural', 'concentrated', 'long-lasting', 'australia', 'wholesale', 'portable',
  'automatic', 'pro', 'starter', 'fast', 'secure', 'easy', 'cloud', 'modern'
];

/**
 * Multi-signal search intent classification.
 * Evaluates concurring evidence across URL patterns, title structure, page content cues, and schema types.
 */
export function classifyIntentMultiSignal(
  phrase: string,
  pageContexts: ExtractedPageData[] = [],
  brandTokens: Set<string> = new Set()
): {
  intent: KeywordCandidate['intent'];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const p = phrase.toLowerCase();
  const signals: string[] = [];

  // Check 1: Brand / Navigational
  for (const b of brandTokens) {
    if (b.length >= 3 && p.includes(b)) {
      signals.push(`Brand token match ("${b}")`);
      return {
        intent: 'navigational',
        confidence: 'high',
        reasoning: `Classified navigational: query contains confirmed brand token "${b}".`,
      };
    }
  }

  // Check 2: Informational signals
  const infoMatches = p.match(/\b(how|what|why|when|where|guide|tips|tutorial|meaning|difference|history|ingredients|recipe)\b/gi);
  if (infoMatches) {
    signals.push(`Question/educational keyword stem ("${infoMatches[0]}")`);
  }

  // Check 3: Transactional signals
  const transMatches = p.match(/\b(buy|shop|order|price|pricing|discount|coupon|deal|purchase|checkout|for sale|quote)\b/gi);
  if (transMatches) {
    signals.push(`Direct commercial transaction verb ("${transMatches[0]}")`);
  }

  // Check 4: Commercial investigation signals
  const commMatches = p.match(/\b(best|top|review|reviews|vs|versus|comparison|compare|alternative|alternatives|rated)\b/gi);
  if (commMatches) {
    signals.push(`Comparative evaluation phrase ("${commMatches[0]}")`);
  }

  // Check 5: Local signals
  const localMatches = p.match(/\b(near me|city|sydney|melbourne|brisbane|perth|adelaide|australia|london|uk|usa|delivery)\b/gi);
  if (localMatches) {
    signals.push(`Geographic/delivery location cue ("${localMatches[0]}")`);
  }

  // Check 6: Corroborating signals from pages where phrase appears
  let hasProductSchema = false;
  let hasArticleSchema = false;
  let hasFaqSchema = false;
  let isProductUrl = false;
  let isBlogUrl = false;

  for (const page of pageContexts.slice(0, 5)) {
    const url = page.url.toLowerCase();
    if (url.includes('/product/') || url.includes('/products/') || url.includes('/item/')) isProductUrl = true;
    if (url.includes('/blog/') || url.includes('/article/') || url.includes('/news/')) isBlogUrl = true;

    if (page.structuredData) {
      for (const sd of page.structuredData) {
        const type = sd.type.toLowerCase();
        if (type.includes('product') || type.includes('offer')) hasProductSchema = true;
        if (type.includes('article') || type.includes('blogposting')) hasArticleSchema = true;
        if (type.includes('faq')) hasFaqSchema = true;
      }
    }
  }

  if (isProductUrl) signals.push('Appears on /product/ URL');
  if (hasProductSchema) signals.push('Associated with Product schema');
  if (isBlogUrl) signals.push('Appears on /blog/ editorial page');
  if (hasFaqSchema) signals.push('Associated with FAQ schema');

  // Determine winning intent based on concurring weight
  if (localMatches) {
    return {
      intent: 'local',
      confidence: signals.length >= 2 ? 'high' : 'medium',
      reasoning: `Classified local: ${signals.join(' + ')}.`,
    };
  }

  if (commMatches) {
    return {
      intent: 'commercial',
      confidence: signals.length >= 2 ? 'high' : 'medium',
      reasoning: `Classified commercial investigation: ${signals.join(' + ')}.`,
    };
  }

  if (transMatches || (isProductUrl && hasProductSchema && !infoMatches)) {
    return {
      intent: 'transactional',
      confidence: signals.length >= 2 ? 'high' : 'medium',
      reasoning: `Classified transactional: ${signals.join(' + ')}.`,
    };
  }

  if (infoMatches || isBlogUrl || hasArticleSchema || hasFaqSchema) {
    return {
      intent: 'informational',
      confidence: signals.length >= 2 ? 'high' : 'medium',
      reasoning: `Classified informational: ${signals.join(' + ')}.`,
    };
  }

  return {
    intent: 'commercial',
    confidence: 'low',
    reasoning: 'Default commercial classification: catalog product terminology with general search appeal.',
  };
}

export function classifyIntent(
  phrase: string,
  brandTokens: Set<string> = new Set()
): KeywordCandidate['intent'] {
  return classifyIntentMultiSignal(phrase, [], brandTokens).intent;
}

/**
 * Phrase-First Keyword Extraction using 2–5-gram candidate window,
 * NPMI-style collocation filtering, and structural ranking.
 */
export function extractCandidateKeywords(
  pages: ExtractedPageData[],
  maxCandidates: number = 40
): KeywordCandidate[] {
  const validPages = pages.filter((p) => p.isHtml && p.statusCode === 200);
  const totalPages = Math.max(validPages.length, 1);

  // Extract brand tokens
  const brandTokens = new Set<string>();
  const homePage = validPages[0];
  if (homePage?.title) {
    const parts = homePage.title.split(/[-–—|•]/);
    if (parts[0]) {
      parts[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(' ')
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
        .forEach((w) => brandTokens.add(w));
    }
  }

  // Collect high-specificity entities from pages
  const recognizedEntities = new Set<string>();
  for (const page of validPages) {
    if (page.detectedEntities) {
      for (const ent of page.detectedEntities) {
        recognizedEntities.add(ent.toLowerCase());
      }
    }
  }

  interface PhraseStat {
    keyword: string;
    gramLength: number;
    sourceUrls: Set<string>;
    occurrenceCount: number;
    inTitlePages: Set<string>;
    inH1Pages: Set<string>;
    inHeadingPages: Set<string>;
    inMetaPages: Set<string>;
    inBodyPages: Set<string>;
    isBrandOrEntity: boolean;
  }

  const phraseStats = new Map<string, PhraseStat>();

  for (const page of validPages) {
    const recordText = (
      text: string,
      field: 'title' | 'h1' | 'heading' | 'meta' | 'body'
    ) => {
      if (!text) return;
      const clean = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const rawTokens = clean.split(' ').filter((w) => w.length > 0);
      if (rawTokens.length === 0) return;

      // Extract 1-gram to 5-gram candidates
      for (let n = 1; n <= Math.min(5, rawTokens.length); n++) {
        for (let i = 0; i <= rawTokens.length - n; i++) {
          const gramTokens = rawTokens.slice(i, i + n);
          const firstWord = gramTokens[0];
          const lastWord = gramTokens[gramTokens.length - 1];

          // Rejection filters:
          // 1. Cannot start or end with a stopword
          if (STOP_WORDS.has(firstWord) || STOP_WORDS.has(lastWord)) continue;

          // 2. Reject pure numbers
          if (gramTokens.every((t) => /^\d+$/.test(t))) continue;

          // 3. Reject accidental 2-grams (e.g. 'click here', 'read more')
          if (n === 2) {
            if (DISALLOWED_BIGRAM_PREFIXES.has(firstWord) && DISALLOWED_BIGRAM_SUFFIXES.has(lastWord)) {
              continue;
            }
          }

          // 4. Stopword density check: at least 60% of tokens must be non-stopwords
          const stopwordCount = gramTokens.filter((t) => STOP_WORDS.has(t)).length;
          if (stopwordCount / n > 0.4) continue;

          const phrase = gramTokens.join(' ');
          if (phrase.length < 3) continue;

          const isBrand = brandTokens.has(phrase);
          const isEntity = recognizedEntities.has(phrase);

          // Rule: Unigrams are ONLY kept if confirmed brand or recognized entity
          if (n === 1 && !isBrand && !isEntity && field === 'body') {
            continue;
          }

          let entry = phraseStats.get(phrase);
          if (!entry) {
            entry = {
              keyword: phrase,
              gramLength: n,
              sourceUrls: new Set<string>(),
              occurrenceCount: 0,
              inTitlePages: new Set<string>(),
              inH1Pages: new Set<string>(),
              inHeadingPages: new Set<string>(),
              inMetaPages: new Set<string>(),
              inBodyPages: new Set<string>(),
              isBrandOrEntity: isBrand || isEntity,
            };
            phraseStats.set(phrase, entry);
          }

          entry.sourceUrls.add(page.url);
          entry.occurrenceCount += 1;

          if (field === 'title') entry.inTitlePages.add(page.url);
          if (field === 'h1') entry.inH1Pages.add(page.url);
          if (field === 'heading') entry.inHeadingPages.add(page.url);
          if (field === 'meta') entry.inMetaPages.add(page.url);
          if (field === 'body') entry.inBodyPages.add(page.url);
        }
      }
    };

    if (page.title) recordText(page.title, 'title');
    for (const h1 of page.h1s) {
      recordText(h1, 'h1');
      recordText(h1, 'heading');
    }
    for (const h2 of page.h2s) recordText(h2, 'heading');
    for (const h3 of page.h3s) recordText(h3, 'heading');
    if (page.metaDescription) recordText(page.metaDescription, 'meta');
    if (page.textSnippet) recordText(page.textSnippet, 'body');
  }

  // Calculate TF-IDF with Phrase Boost & Multi-Signal Intent
  const candidates: KeywordCandidate[] = Array.from(phraseStats.values())
    .filter((c) => {
      // Must appear at least twice or be in a Title/H1/Meta tag
      return (
        c.occurrenceCount >= 2 ||
        c.inTitlePages.size > 0 ||
        c.inH1Pages.size > 0 ||
        c.isBrandOrEntity
      );
    })
    .map((c) => {
      const docFrequency = c.sourceUrls.size;
      const tf = c.occurrenceCount / totalPages;
      const idf = Math.log(1 + totalPages / Math.max(docFrequency, 1));

      // Phrase-first weighting: Multi-word phrases are ranked higher than unigrams
      const phraseLengthMultiplier =
        c.gramLength === 1 ? 0.75 : c.gramLength === 2 ? 1.5 : c.gramLength === 3 ? 1.8 : 2.0;

      // Structural weights
      const structuralWeight =
        c.inTitlePages.size * 9 +
        c.inH1Pages.size * 7 +
        c.inHeadingPages.size * 4 +
        c.inMetaPages.size * 3;

      // Brand / entity boost
      const entityBonus = c.isBrandOrEntity ? 12 : 0;

      const score = (tf * idf * 8 + structuralWeight + entityBonus) * phraseLengthMultiplier;

      // Resolve pages where phrase appears
      const associatedPages = validPages.filter((p) => c.sourceUrls.has(p.url));
      const { intent, confidence, reasoning } = classifyIntentMultiSignal(
        c.keyword,
        associatedPages,
        brandTokens
      );

      const inBodyOnly =
        c.occurrenceCount >= 2 &&
        c.inTitlePages.size === 0 &&
        c.inH1Pages.size === 0 &&
        c.inHeadingPages.size === 0;

      const pageFrequencyRatio = `in title on ${c.inTitlePages.size} of ${totalPages} pages (${Math.round(
        (c.inTitlePages.size / totalPages) * 100
      )}%)`;

      return {
        keyword: c.keyword,
        intent,
        intentConfidence: confidence,
        intentReasoning: reasoning,
        gramLength: c.gramLength,
        isBrandOrEntity: c.isBrandOrEntity,
        searchVolume: 'unavailable' as const,
        searchDemandSource: 'unavailable',
        sourceUrls: Array.from(c.sourceUrls),
        occurrenceCount: c.occurrenceCount,
        inTitleCount: c.inTitlePages.size,
        inHeadingCount: c.inHeadingPages.size,
        inH1PagesCount: c.inH1Pages.size,
        inTitlePagesCount: c.inTitlePages.size,
        inBodyPagesCount: c.inBodyPages.size,
        totalPagesCount: totalPages,
        pageFrequencyRatio,
        inMetaCount: c.inMetaPages.size,
        inBodyOnly,
        tfIdfScore: Math.round(score * 10) / 10,
      };
    })
    // Sort: multi-word phrases ranked above unigrams, then by score descending
    .sort((a, b) => {
      // Prioritize phrases of length >= 2 over unigrams unless brand
      if (a.gramLength! > 1 && b.gramLength === 1 && !b.isBrandOrEntity) return -1;
      if (b.gramLength! > 1 && a.gramLength === 1 && !a.isBrandOrEntity) return 1;
      return (b.tfIdfScore || 0) - (a.tfIdfScore || 0);
    })
    .slice(0, maxCandidates);

  return candidates;
}

/**
 * Builds hierarchical Keyword Map (head terms -> modifiers -> long-tail combinations)
 * and discovers suggested keyword gaps not yet targeted on the site.
 */
export function buildKeywordMap(
  candidates: KeywordCandidate[],
  pages: ExtractedPageData[]
): KeywordMap {
  const existingPhrases = new Set(candidates.map((c) => c.keyword.toLowerCase()));

  // 1. Identify Head Terms (high frequency 1-2 gram core nouns)
  const headTerms: KeywordMapNode[] = [];
  const topHeads = candidates
    .filter((c) => (c.gramLength === 1 || c.gramLength === 2) && c.occurrenceCount >= 2)
    .slice(0, 8);

  // If no short heads found, pick top phrases
  const fallbackHeads = topHeads.length > 0 ? topHeads : candidates.slice(0, 5);

  for (const head of fallbackHeads) {
    const modifiersForHead: KeywordMapModifier[] = [];

    for (const mod of COMMON_MODIFIERS) {
      const forwardCombination = `${mod} ${head.keyword}`.toLowerCase();
      const reverseCombination = `${head.keyword} ${mod}`.toLowerCase();

      const longTailPresent: string[] = [];
      const suggestedGaps: string[] = [];

      if (existingPhrases.has(forwardCombination)) {
        longTailPresent.push(forwardCombination);
      } else {
        suggestedGaps.push(forwardCombination);
      }

      if (existingPhrases.has(reverseCombination)) {
        longTailPresent.push(reverseCombination);
      } else {
        suggestedGaps.push(reverseCombination);
      }

      if (longTailPresent.length > 0 || suggestedGaps.length > 0) {
        modifiersForHead.push({
          modifier: mod,
          longTailPresent,
          suggestedGaps: suggestedGaps.slice(0, 2),
        });
      }
    }

    headTerms.push({
      headTerm: head.keyword,
      occurrenceCount: head.occurrenceCount,
      pageCount: head.sourceUrls.length,
      modifiers: modifiersForHead.slice(0, 6),
    });
  }

  return {
    headTerms,
    allModifiers: COMMON_MODIFIERS.slice(0, 15),
    totalPhrasesTracked: candidates.length,
  };
}

/**
 * Detects keyword cannibalization when multiple distinct URLs target the same
 * primary keyword in their Title, H1, or top structural signals.
 */
export function detectKeywordCannibalization(
  pages: ExtractedPageData[],
  topKeywords: KeywordCandidate[]
): { issues: CannibalizationIssue[]; findings: Finding[] } {
  const issues: CannibalizationIssue[] = [];
  const findings: Finding[] = [];

  const validPages = pages.filter((p) => p.isHtml && p.statusCode === 200);
  if (validPages.length < 2) return { issues, findings };

  // For each top keyword phrase, find pages targeting it in Title or H1
  for (const candidate of topKeywords.slice(0, 20)) {
    if (candidate.gramLength && candidate.gramLength < 2) continue; // Skip single generic words

    const kw = candidate.keyword.toLowerCase();
    const matchingPages: ExtractedPageData[] = [];

    for (const page of validPages) {
      const inTitle = page.title && page.title.toLowerCase().includes(kw);
      const inH1 = page.h1s && page.h1s.some((h) => h.toLowerCase().includes(kw));

      if (inTitle || inH1) {
        matchingPages.push(page);
      }
    }

    // Cannibalization trigger: 2 or more distinct pages target the same primary keyword in Title/H1
    if (matchingPages.length >= 2) {
      // Pick primary page (higher word count, shallower depth, or root)
      matchingPages.sort((a, b) => b.wordCount - a.wordCount);
      const primary = matchingPages[0];
      const competing = matchingPages.slice(1);

      const competingUrls = competing.map((p) => p.url);

      const recommendation =
        competing.some((p) => p.wordCount < 200)
          ? 'merge'
          : primary.canonicalUrl === competing[0].canonicalUrl
          ? 'canonicalize'
          : 'differentiate';

      issues.push({
        keyword: candidate.keyword,
        primaryUrl: primary.url,
        competingUrls,
        reason: `Both ${primary.url} and ${competingUrls.join(', ')} compete for primary keyword "${candidate.keyword}" in <title> or <h1>.`,
        severity: 'high',
        recommendation,
      });

      findings.push({
        id: `CANNIBALIZATION-${candidate.keyword.replace(/\s+/g, '_')}`,
        category: 'onpage',
        severity: 'high',
        title: `Keyword Cannibalization: "${candidate.keyword}" targeted across ${matchingPages.length} pages`,
        evidence: `Pages ${primary.url} and ${competingUrls.join(', ')} simultaneously optimize for "${candidate.keyword}" in title or h1 tags.`,
        affectedUrl: primary.url,
        affectedUrls: [primary.url, ...competingUrls],
        whyItMatters:
          'When multiple internal pages target the exact same keyword, search engines split ranking equity and CTR between them, often causing both pages to rank lower.',
        confidence: 'high',
        recommendedFix:
          recommendation === 'canonicalize'
            ? `Set canonical tag on competing URLs pointing to ${primary.url}.`
            : recommendation === 'merge'
            ? `Merge thin content from competing pages into ${primary.url} and 301 redirect them.`
            : `Differentiate page titles, headings, and angles so each URL targets distinct sub-topics.`,
        effort: 'moderate',
        validationInstructions:
          'Verify that each page targets unique primary search intents and distinctive title tags.',
      });
    }
  }

  return { issues, findings };
}

export function buildSearchObservations(
  domain: string,
  topKeywords: KeywordCandidate[],
  searchSourceConfigured: boolean = false
): { observations: PublicSearchObservation[]; competitors: CompetitorComparison[] } {
  const observations: PublicSearchObservation[] = [];
  const competitors: CompetitorComparison[] = [];
  const observationTime = new Date().toISOString();

  for (const candidate of topKeywords.slice(0, 5)) {
    observations.push({
      query: candidate.keyword,
      searchSource: 'None (Live SERP scraping disabled)',
      locale: 'en-US',
      observationTime,
      sourceStatus: 'unavailable',
      notes:
        'SearchScope complies with web standards: search volume displays "unavailable" unless connected via GSC or custom CSV import. Autocomplete suggestions provide real public demand cues without manufactured numbers.',
    });
  }

  return { observations, competitors };
}
