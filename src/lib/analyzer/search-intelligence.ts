import { ExtractedPageData, KeywordCandidate, PublicSearchObservation, CompetitorComparison } from '../../types/audit';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'won\'t', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'will', 'just', 'like', 'also', 'page', 'site', 'website', 'click', 'read', 'learn', 'more'
]);

function classifyIntent(phrase: string): KeywordCandidate['intent'] {
  const p = phrase.toLowerCase();

  if (/\b(buy|order|purchase|pricing|price|cost|quote|discount|coupon|deal|subscribe|signup|sign up|hire|download|checkout)\b/.test(p)) {
    return 'transactional';
  }
  if (/\b(best|top|vs|versus|compare|comparison|review|reviews|alternative|alternatives|pros and cons|features)\b/.test(p)) {
    return 'commercial';
  }
  if (/\b(login|log in|signin|portal|app|dashboard|account|support|contact|status|docs|documentation)\b/.test(p)) {
    return 'navigational';
  }
  if (/\b(near me|in [a-z]+|city|downtown|local|service area|area code)\b/.test(p)) {
    return 'local';
  }

  return 'informational';
}

/**
 * Extracts high-signal candidate keywords from crawled page titles, headings, and body copy.
 * Strictly avoids fabricating any artificial search volume, CPC, or difficulty scores.
 */
export function extractCandidateKeywords(pages: ExtractedPageData[], maxCandidates: number = 30): KeywordCandidate[] {
  const candidateStats = new Map<string, {
    keyword: string;
    sourceUrls: Set<string>;
    occurrenceCount: number;
    inTitleCount: number;
    inHeadingCount: number;
  }>();

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    // Helper to register phrases
    const processPhrase = (phrase: string, inTitle: boolean, inHeading: boolean) => {
      const clean = phrase.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = clean.split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      if (tokens.length === 0) return;

      // Extract 1-gram, 2-gram, and 3-gram candidate combinations
      for (let n = 1; n <= Math.min(3, tokens.length); n++) {
        for (let i = 0; i <= tokens.length - n; i++) {
          const gram = tokens.slice(i, i + n).join(' ');
          if (gram.length < 4) continue;

          // Avoid grams consisting only of stop words or single characters
          const existing = candidateStats.get(gram) || {
            keyword: gram,
            sourceUrls: new Set<string>(),
            occurrenceCount: 0,
            inTitleCount: 0,
            inHeadingCount: 0,
          };

          existing.sourceUrls.add(page.url);
          existing.occurrenceCount += 1;
          if (inTitle) existing.inTitleCount += 1;
          if (inHeading) existing.inHeadingCount += 1;

          candidateStats.set(gram, existing);
        }
      }
    };

    // 1. Process Title
    if (page.title) {
      processPhrase(page.title, true, false);
    }

    // 2. Process Headings
    for (const h1 of page.h1s) processPhrase(h1, false, true);
    for (const h2 of page.h2s) processPhrase(h2, false, true);
    for (const h3 of page.h3s) processPhrase(h3, false, true);

    // 3. Process Snippet
    processPhrase(page.textSnippet, false, false);
  }

  // Filter and rank candidates by presence in titles, headings, and multiple pages
  const candidates: KeywordCandidate[] = Array.from(candidateStats.values())
    .filter((c) => c.occurrenceCount >= 2 || c.inTitleCount > 0 || c.inHeadingCount > 0)
    .sort((a, b) => {
      // Score calculation based solely on observable structural occurrence
      const scoreA = a.inTitleCount * 5 + a.inHeadingCount * 3 + a.sourceUrls.size * 2 + a.occurrenceCount;
      const scoreB = b.inTitleCount * 5 + b.inHeadingCount * 3 + b.sourceUrls.size * 2 + b.occurrenceCount;
      return scoreB - scoreA;
    })
    .slice(0, maxCandidates)
    .map((c) => ({
      keyword: c.keyword,
      intent: classifyIntent(c.keyword),
      sourceUrls: Array.from(c.sourceUrls),
      occurrenceCount: c.occurrenceCount,
      inTitleCount: c.inTitleCount,
      inHeadingCount: c.inHeadingCount,
    }));

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
    // Generate truthful records for the top candidate queries
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
