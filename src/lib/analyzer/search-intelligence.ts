import {
  ExtractedPageData,
  KeywordCandidate,
  PublicSearchObservation,
  CompetitorComparison,
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
  'item', 'items', 'add', 'added', 'viewing', 'continue', 'terms', 'privacy'
]);

export function classifyIntent(phrase: string, brandTokens: Set<string> = new Set()): KeywordCandidate['intent'] {
  const p = phrase.toLowerCase();

  // 1. Navigational: contains brand name or brand token
  for (const b of brandTokens) {
    if (b.length >= 3 && p.includes(b)) {
      return 'navigational';
    }
  }

  // 2. Informational: question words and educational queries take precedence over product nouns
  if (
    /\b(how|what|why|when|recipe|tips|guide|history|meaning|difference|tutorial|accords|ingredients|longevity|application)\b/i.test(
      p
    )
  ) {
    return 'informational';
  }

  // 3. Transactional: explicit purchasing intent words
  if (
    /\b(buy|shop|price|pricing|order|cost|sale|discount|cart|cheap|premium|store|purchase|quote|deal|coupon|checkout|add to cart)\b/i.test(
      p
    )
  ) {
    return 'transactional';
  }

  // 4. Local: regional and city references
  if (
    /\b(city|near me|location|delivery|shipping|australia|sydney|melbourne|canberra|brisbane|perth|adelaide|uk|usa)\b/i.test(
      p
    )
  ) {
    return 'local';
  }

  // 5. Commercial: comparative and evaluation intent
  if (
    /\b(best|review|reviews|top|vs|versus|comparison|compare|alternative|alternatives|fragrance oil|perfume oil|perfume|cologne|attar|collection|scent profile)\b/i.test(
      p
    )
  ) {
    return 'commercial';
  }

  return 'commercial'; // Default commercial intent for e-commerce catalog keywords
}

/**
 * Extracts candidate 1-gram, 2-gram, and 3-gram keywords using TF-IDF,
 * domain breadth weighting, and structural per-page signal counting.
 */
export function extractCandidateKeywords(
  pages: ExtractedPageData[],
  maxCandidates: number = 40
): KeywordCandidate[] {
  const validPages = pages.filter((p) => p.isHtml && p.statusCode === 200);
  const totalPages = Math.max(validPages.length, 1);

  // Extract brand tokens from domain and home page
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

  // Term occurrence statistics
  const termStats = new Map<
    string,
    {
      keyword: string;
      sourceUrls: Set<string>;
      occurrenceCount: number;
      inTitlePages: Set<string>;
      inH1Pages: Set<string>;
      inHeadingPages: Set<string>;
      inMetaPages: Set<string>;
      inBodyPages: Set<string>;
    }
  >();

  for (const page of validPages) {
    const recordPhrase = (
      phrase: string,
      field: 'title' | 'h1' | 'heading' | 'meta' | 'body'
    ) => {
      if (!phrase) return;
      const clean = phrase
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const tokens = clean.split(' ').filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

      if (tokens.length === 0) return;

      // Extract 1-gram, 2-gram, and 3-gram candidates
      for (let n = 1; n <= Math.min(3, tokens.length); n++) {
        for (let i = 0; i <= tokens.length - n; i++) {
          const gram = tokens.slice(i, i + n).join(' ');
          if (gram.length < 3) continue;
          if (/^\d+$/.test(gram)) continue;

          let entry = termStats.get(gram);
          if (!entry) {
            entry = {
              keyword: gram,
              sourceUrls: new Set<string>(),
              occurrenceCount: 0,
              inTitlePages: new Set<string>(),
              inH1Pages: new Set<string>(),
              inHeadingPages: new Set<string>(),
              inMetaPages: new Set<string>(),
              inBodyPages: new Set<string>(),
            };
            termStats.set(gram, entry);
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

    // 1. Title
    if (page.title) recordPhrase(page.title, 'title');

    // 2. Headings
    for (const h1 of page.h1s) {
      recordPhrase(h1, 'h1');
      recordPhrase(h1, 'heading');
    }
    for (const h2 of page.h2s) recordPhrase(h2, 'heading');
    for (const h3 of page.h3s) recordPhrase(h3, 'heading');

    // 3. Meta Description
    if (page.metaDescription) recordPhrase(page.metaDescription, 'meta');

    // 4. Body Content
    if (page.textSnippet) recordPhrase(page.textSnippet, 'body');
  }

  // Calculate TF-IDF score with domain specificity boost and rank candidates
  const candidates: KeywordCandidate[] = Array.from(termStats.values())
    .filter(
      (c) =>
        c.occurrenceCount >= 2 ||
        c.inTitlePages.size > 0 ||
        c.inH1Pages.size > 0 ||
        c.inMetaPages.size > 0
    )
    .map((c) => {
      const docFrequency = c.sourceUrls.size;
      const tf = c.occurrenceCount / totalPages;
      const idf = Math.log(1 + totalPages / Math.max(docFrequency, 1));

      // Domain breadth bonus: core brand/topic terms appear across multiple pages and should be boosted, not penalized
      const domainBreadth = docFrequency / totalPages;
      const domainBreadthBonus = domainBreadth > 0.2 ? domainBreadth * 15 : 0;

      // Structural weight based on unique page counts
      const structuralWeight =
        c.inTitlePages.size * 8 +
        c.inH1Pages.size * 6 +
        c.inHeadingPages.size * 3 +
        c.inMetaPages.size * 3;

      const score = tf * idf * 8 + structuralWeight + domainBreadthBonus;

      const inBodyOnly =
        c.occurrenceCount > 3 &&
        c.inTitlePages.size === 0 &&
        c.inH1Pages.size === 0 &&
        c.inHeadingPages.size === 0;

      const intent = classifyIntent(c.keyword, brandTokens);

      const pageFrequencyRatio = `in title on ${c.inTitlePages.size} of ${totalPages} pages (${Math.round(
        (c.inTitlePages.size / totalPages) * 100
      )}%)`;

      return {
        keyword: c.keyword,
        intent,
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
    .sort((a, b) => (b.tfIdfScore || 0) - (a.tfIdfScore || 0))
    .slice(0, maxCandidates);

  return candidates;
}

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
