import { ExtractedPageData, KeywordCandidate, PublicSearchObservation, CompetitorComparison } from '../../types/audit';

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
  'home', 'com', 'http', 'https', 'www', 'one', 'two', 'new', 'get', 'use', 'using', 'see', 'all', 'now'
]);

function classifyIntent(phrase: string): KeywordCandidate['intent'] {
  const p = phrase.toLowerCase();

  if (/\b(buy|order|purchase|pricing|price|cost|quote|discount|coupon|deal|subscribe|signup|sign up|hire|download|checkout|shop|cart|store)\b/.test(p)) {
    return 'transactional';
  }
  if (/\b(best|top|vs|versus|compare|comparison|review|reviews|alternative|alternatives|pros and cons|features|perfume|luxury|fragrance|collection)\b/.test(p)) {
    return 'commercial';
  }
  if (/\b(login|log in|signin|portal|app|dashboard|account|support|contact|status|docs|documentation|about|brand|terms|privacy)\b/.test(p)) {
    return 'navigational';
  }
  if (/\b(near me|in [a-z]+|city|downtown|local|service area|australia|sydney|melbourne|uk|usa|delivery|shipping)\b/.test(p)) {
    return 'local';
  }

  return 'informational';
}

/**
 * Extracts high-signal candidate keywords from crawled page titles, headings,
 * body copy, and URL slugs using TF-IDF and structural signal weighting.
 */
export function extractCandidateKeywords(
  pages: ExtractedPageData[],
  maxCandidates: number = 40
): KeywordCandidate[] {
  const validPages = pages.filter((p) => p.isHtml && p.statusCode === 200);
  const totalPages = Math.max(validPages.length, 1);

  // Term occurrence statistics: term -> stats
  const termStats = new Map<
    string,
    {
      keyword: string;
      sourceUrls: Set<string>;
      occurrenceCount: number;
      inTitleCount: number;
      inHeadingCount: number;
      inMetaCount: number;
      docFrequency: number;
    }
  >();

  for (const page of validPages) {
    const pageTermsSeen = new Set<string>();

    const recordPhrase = (
      phrase: string,
      inTitle: boolean,
      inHeading: boolean,
      inMeta: boolean
    ) => {
      if (!phrase) return;
      const clean = phrase
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const tokens = clean.split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      if (tokens.length === 0) return;

      // Extract 1-gram, 2-gram, and 3-gram candidate combinations
      for (let n = 1; n <= Math.min(3, tokens.length); n++) {
        for (let i = 0; i <= tokens.length - n; i++) {
          const gram = tokens.slice(i, i + n).join(' ');
          if (gram.length < 3) continue;

          // Avoid grams consisting only of stop words or numbers
          if (/^\d+$/.test(gram)) continue;

          let entry = termStats.get(gram);
          if (!entry) {
            entry = {
              keyword: gram,
              sourceUrls: new Set<string>(),
              occurrenceCount: 0,
              inTitleCount: 0,
              inHeadingCount: 0,
              inMetaCount: 0,
              docFrequency: 0,
            };
            termStats.set(gram, entry);
          }

          entry.sourceUrls.add(page.url);
          entry.occurrenceCount += 1;
          if (inTitle) entry.inTitleCount += 1;
          if (inHeading) entry.inHeadingCount += 1;
          if (inMeta) entry.inMetaCount += 1;

          if (!pageTermsSeen.has(gram)) {
            pageTermsSeen.add(gram);
            entry.docFrequency += 1;
          }
        }
      }
    };

    // 1. Process Title
    if (page.title) recordPhrase(page.title, true, false, false);

    // 2. Process Meta Description
    if (page.metaDescription) recordPhrase(page.metaDescription, false, false, true);

    // 3. Process Headings
    for (const h1 of page.h1s) recordPhrase(h1, false, true, false);
    for (const h2 of page.h2s) recordPhrase(h2, false, true, false);
    for (const h3 of page.h3s) recordPhrase(h3, false, true, false);

    // 4. Process Alt texts
    for (const img of page.images) {
      if (img.alt) recordPhrase(img.alt, false, false, false);
    }

    // 5. Process Text Snippet
    if (page.textSnippet) recordPhrase(page.textSnippet, false, false, false);
  }

  // Calculate TF-IDF score and rank candidates
  const candidates: KeywordCandidate[] = Array.from(termStats.values())
    .filter(
      (c) =>
        c.occurrenceCount >= 2 ||
        c.inTitleCount > 0 ||
        c.inHeadingCount > 0 ||
        c.inMetaCount > 0
    )
    .map((c) => {
      // TF-IDF: (occurrences / totalPages) * ln(1 + totalPages / docFrequency)
      const tf = c.occurrenceCount / totalPages;
      const idf = Math.log(1 + totalPages / Math.max(c.docFrequency, 1));
      const structuralWeight = c.inTitleCount * 6 + c.inHeadingCount * 4 + c.inMetaCount * 3;
      const score = tf * idf * 10 + structuralWeight;

      const inBodyOnly = c.occurrenceCount > 3 && c.inTitleCount === 0 && c.inHeadingCount === 0;

      return {
        keyword: c.keyword,
        intent: classifyIntent(c.keyword),
        sourceUrls: Array.from(c.sourceUrls),
        occurrenceCount: c.occurrenceCount,
        inTitleCount: c.inTitleCount,
        inHeadingCount: c.inHeadingCount,
        inMetaCount: c.inMetaCount,
        inBodyOnly,
        tfIdfScore: Math.round(score * 10) / 10,
      };
    })
    .sort((a, b) => (b.tfIdfScore || 0) - (a.tfIdfScore || 0))
    .slice(0, maxCandidates);

  return candidates;
}

/**
 * Handles public search observations with explicit data provenance.
 * If live search source credentials or connections are not provided,
 * it returns honest, transparent "unavailable" records rather than fabricating fake rankings.
 */
export function buildSearchObservations(
  domain: string,
  topKeywords: KeywordCandidate[],
  searchSourceConfigured: boolean = false
): { observations: PublicSearchObservation[]; competitors: CompetitorComparison[] } {
  const observations: PublicSearchObservation[] = [];
  const competitors: CompetitorComparison[] = [];
  const observationTime = new Date().toISOString();

  if (!searchSourceConfigured) {
    for (const candidate of topKeywords.slice(0, 5)) {
      observations.push({
        query: candidate.keyword,
        searchSource: 'None (Public Live SERP disabled by default)',
        locale: 'en-US',
        observationTime,
        sourceStatus: 'unavailable',
        notes:
          'Live search ranking observation is disabled to prevent unauthorized web scraping, avoid violating search engine terms, and keep audits 100% free with zero paid API keys.',
      });
    }

    return { observations, competitors };
  }

  return { observations, competitors };
}
