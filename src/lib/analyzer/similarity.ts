import { ExtractedPageData, Finding } from '../../types/audit';

function get3Shingles(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const shingles = new Set<string>();
  for (let i = 0; i < words.length - 2; i++) {
    shingles.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return shingles;
}

function calculateJaccardSimilarity(s1: Set<string>, s2: Set<string>): number {
  if (s1.size === 0 || s2.size === 0) return 0;
  let intersection = 0;
  for (const item of s1) {
    if (s2.has(item)) intersection++;
  }
  const union = s1.size + s2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function analyzeContentSimilarity(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  // Group pages by apparent type (e.g. product pages, blog articles, collection pages)
  const productPages = pages.filter((p) => p.isHtml && p.statusCode === 200 && p.url.includes('/product/'));
  if (productPages.length < 2) return findings;

  // Prepare shingles after removing product H1/title
  const pageShingles = productPages.map((page) => {
    let cleanText = (page.textSnippet || '').toLowerCase();
    const h1 = (page.h1s[0] || '').toLowerCase();
    if (h1) {
      cleanText = cleanText.split(h1).join(' ');
    }
    return {
      page,
      shingles: get3Shingles(cleanText),
    };
  });

  const flaggedPairs = new Set<string>();

  for (let i = 0; i < pageShingles.length; i++) {
    for (let j = i + 1; j < pageShingles.length; j++) {
      const p1 = pageShingles[i];
      const p2 = pageShingles[j];

      if (p1.shingles.size < 15 || p2.shingles.size < 15) continue;

      const similarity = calculateJaccardSimilarity(p1.shingles, p2.shingles);
      if (similarity >= 0.75) {
        const pairKey = [p1.page.normalizedUrl, p2.page.normalizedUrl].sort().join('::');
        if (!flaggedPairs.has(pairKey)) {
          flaggedPairs.add(pairKey);

          findings.push({
            id: `CONTENT-NEAR-DUPLICATE-${p1.page.normalizedUrl}`,
            category: 'content',
            severity: 'medium',
            title: `High template / near-duplicate content similarity (${Math.round(similarity * 100)}% match)`,
            evidence: `Body content on "${p1.page.url}" shares ${Math.round(similarity * 100)}% identical 3-gram text shingles with "${p2.page.url}" after discounting the product title. Both pages heavily reuse identical boilerplate sections without sufficient product-specific description copy.`,
            affectedUrl: p1.page.url,
            whyItMatters:
              'E-commerce catalogs where product pages reuse identical long descriptions risk internal cannibalization, lower organic rankings, and being categorized as thin or templated content by Google algorithms.',
            confidence: 'high',
            recommendedFix:
              'Introduce unique, custom scent notes, formulation stories, and specific care instructions for each individual product rather than reusing boilerplate descriptions.',
            effort: 'moderate',
            validationInstructions: 'Ensure unique product descriptions constitute at least 50% of page text.',
          });
        }
      }
    }
  }

  return findings;
}
