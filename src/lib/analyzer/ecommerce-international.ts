import { ExtractedPageData, Finding } from '../../types/audit';

// ISO 639-1 language codes set
const VALID_ISO_639_1 = new Set([
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
  'ba', 'be', 'bg', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
  'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
  'da', 'de', 'dv', 'dz',
  'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
  'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
  'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
  'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
  'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
  'ja', 'jv',
  'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
  'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
  'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
  'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
  'oc', 'oj', 'om', 'or', 'os',
  'pa', 'pi', 'pl', 'ps', 'pt',
  'qu',
  'rm', 'rn', 'ro', 'ru', 'rw',
  'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
  'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
  'ug', 'uk', 'ur', 'uz',
  've', 'vi', 'vo',
  'wa', 'wo',
  'xh',
  'yi', 'yo',
  'za', 'zh', 'zu'
]);

/**
 * 64-bit FNV-1a Hash function returning BigInt
 */
function fnv1a64(str: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash;
}

/**
 * Computes 64-bit SimHash of text using 3-word shingles for accurate document deduplication
 */
export function computeSimHash64(text: string): bigint {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return 0n;

  // Build 3-word shingles (tri-grams)
  const tokens: string[] = [];
  if (words.length >= 3) {
    for (let i = 0; i <= words.length - 3; i++) {
      tokens.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  } else {
    tokens.push(...words);
  }

  const v = new Array(64).fill(0);

  for (const token of tokens) {
    const hash = fnv1a64(token);
    for (let i = 0; i < 64; i++) {
      const bit = (hash >> BigInt(i)) & 1n;
      if (bit === 1n) {
        v[i] += 1;
      } else {
        v[i] -= 1;
      }
    }
  }

  let fingerprint = 0n;
  for (let i = 0; i < 64; i++) {
    if (v[i] > 0) {
      fingerprint |= (1n << BigInt(i));
    }
  }

  return fingerprint;
}

/**
 * Calculates bitwise Hamming distance between two 64-bit fingerprints
 */
export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let dist = 0;
  while (x > 0n) {
    dist += Number(x & 1n);
    x >>= 1n;
  }
  return dist;
}

export interface NearDuplicateCluster {
  primaryUrl: string;
  duplicateUrls: string[];
  distance: number;
}

export interface EcommerceInternationalReport {
  gmcIssuesCount: number;
  hreflangIssuesCount: number;
  nearDuplicateClusters: NearDuplicateCluster[];
  findings: Finding[];
}

export function analyzeEcommerceAndInternational(pages: ExtractedPageData[]): EcommerceInternationalReport {
  const findings: Finding[] = [];
  let gmcIssuesCount = 0;
  let hreflangIssuesCount = 0;

  // 1. Google Merchant Center (GMC) Listing & Product Schema Validation
  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    const isProductPage =
      page.pageType === 'product' ||
      page.url.includes('/product/') ||
      page.url.includes('/products/');

    if (isProductPage) {
      // Find Product schemas
      const productSchemas = (page.structuredData || []).filter(
        (s) => s.type.toLowerCase() === 'product'
      );

      if (productSchemas.length === 0) {
        gmcIssuesCount++;
        findings.push({
          id: `GMC_MISSING_PRODUCT_SCHEMA-${page.normalizedUrl}`,
          category: 'structured_data',
          severity: 'high',
          title: 'Product Page Missing Product Schema for Free Google Listings',
          evidence: `Page ${page.url} is identified as a product page but lacks schema.org/Product structured data.`,
          affectedUrl: page.url,
          affectedUrls: [page.url],
          whyItMatters: 'Google Merchant Center free product listings and Rich Results require valid Product structured data.',
          confidence: 'high',
          recommendedFix: 'Implement Product schema with name, image, offers.price, offers.priceCurrency, and offers.availability.',
          effort: 'moderate',
          validationInstructions: 'Test URL in Google Rich Results Test to confirm Product schema eligibility.',
        });
      } else {
        // Inspect Product schema fields
        for (const schema of productSchemas) {
          try {
            const data = JSON.parse(schema.rawJson || '{}');
            const missingFields: string[] = [];

            if (!data.name) missingFields.push('name');
            if (!data.image) missingFields.push('image');

            const offers = data.offers;
            if (!offers) {
              missingFields.push('offers');
            } else {
              const offerObj = Array.isArray(offers) ? offers[0] : offers;
              if (offerObj) {
                if (offerObj.price === undefined && offerObj.lowPrice === undefined) {
                  missingFields.push('offers.price');
                }
                if (!offerObj.priceCurrency) {
                  missingFields.push('offers.priceCurrency');
                }
                if (!offerObj.availability) {
                  missingFields.push('offers.availability');
                }
              }
            }

            const hasIdentifier = Boolean(data.gtin || data.gtin13 || data.gtin8 || data.mpn || data.sku || (data.brand && (data.brand.name || typeof data.brand === 'string')));
            if (!hasIdentifier) {
              missingFields.push('brand or gtin/mpn');
            }

            if (missingFields.length > 0) {
              gmcIssuesCount++;
              findings.push({
                id: `GMC_INCOMPLETE_PRODUCT_SCHEMA-${page.normalizedUrl}`,
                category: 'structured_data',
                severity: 'medium',
                title: 'Product Schema Incomplete for Google Merchant Center Requirements',
                evidence: `Missing essential GMC attributes: ${missingFields.join(', ')} on ${page.url}`,
                affectedUrl: page.url,
                affectedUrls: [page.url],
                whyItMatters: 'Google Merchant Center flags and disapproves free product listings with incomplete pricing, availability, or identifiers.',
                confidence: 'high',
                recommendedFix: `Add missing attributes (${missingFields.join(', ')}) to the Product JSON-LD markup.`,
                effort: 'quick_win',
                validationInstructions: 'Run Rich Results Test to verify all required GMC fields are detected.',
              });
            }
          } catch {
            // rawJson parse error already caught by structured data analyzer
          }
        }
      }
    }
  }

  // 2. International & Hreflang Validation
  const pageByUrl = new Map<string, ExtractedPageData>();
  for (const page of pages) {
    pageByUrl.set(page.url, page);
    pageByUrl.set(page.normalizedUrl, page);
  }

  const pagesWithHreflang = pages.filter(
    (p) => p.hreflangTargets && p.hreflangTargets.length > 0
  );

  for (const page of pagesWithHreflang) {
    const targets = page.hreflangTargets || [];
    let hasSelfRef = false;

    for (const t of targets) {
      // Validate lang code
      const langCode = t.lang.trim().toLowerCase();
      const primaryLang = langCode.split('-')[0];

      if (langCode !== 'x-default' && !VALID_ISO_639_1.has(primaryLang)) {
        hreflangIssuesCount++;
        findings.push({
          id: `HREFLANG_INVALID_LANG_CODE-${page.normalizedUrl}-${langCode}`,
          category: 'technical',
          severity: 'high',
          title: `Invalid hreflang Language Code "${t.lang}"`,
          evidence: `Page ${page.url} specifies hreflang="${t.lang}" pointing to ${t.href}, which is not a valid ISO 639-1 code.`,
          affectedUrl: page.url,
          affectedUrls: [page.url],
          whyItMatters: 'Search engines ignore invalid hreflang annotations, breaking regional and language targeting.',
          confidence: 'high',
          recommendedFix: 'Use standard ISO 639-1 two-letter language codes (e.g. "en", "es") optionally followed by ISO 3166-1 country code (e.g. "en-us").',
          effort: 'quick_win',
          validationInstructions: 'Validate hreflang values against ISO 639-1 and ISO 3166-1 standards.',
        });
      }

      // Check self-reference
      if (t.href === page.url || t.href === page.normalizedUrl) {
        hasSelfRef = true;
      }

      // Check reciprocal hreflang
      const targetPage = pageByUrl.get(t.href);
      if (targetPage && targetPage.hreflangTargets) {
        const hasReciprocal = targetPage.hreflangTargets.some(
          (back) => back.href === page.url || back.href === page.normalizedUrl
        );
        if (!hasReciprocal && t.href !== page.url && t.href !== page.normalizedUrl) {
          hreflangIssuesCount++;
          findings.push({
            id: `HREFLANG_MISSING_RECIPROCAL-${page.normalizedUrl}-${encodeURIComponent(t.href)}`,
            category: 'technical',
            severity: 'medium',
            title: 'Missing Reciprocal hreflang Annotation',
            evidence: `Page ${page.url} links to ${t.href} via hreflang="${t.lang}", but the destination does not link back.`,
            affectedUrl: page.url,
            affectedUrls: [page.url, t.href],
            whyItMatters: 'Google requires reciprocal hreflang annotations. Non-reciprocal tags are treated as invalid and ignored.',
            confidence: 'high',
            recommendedFix: `Add reciprocal <link rel="alternate" hreflang="..." href="${page.url}"> to ${t.href}.`,
            effort: 'moderate',
            validationInstructions: 'Verify bidirectional hreflang tags between regional counterparts.',
          });
        }
      }
    }

    if (!hasSelfRef && targets.length > 0) {
      hreflangIssuesCount++;
      findings.push({
        id: `HREFLANG_MISSING_SELF_REFERENCE-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: 'hreflang Implementation Missing Self-Referential Tag',
        evidence: `Page ${page.url} defines ${targets.length} hreflang target(s) but does not include a self-referential tag for itself.`,
        affectedUrl: page.url,
        affectedUrls: [page.url],
        whyItMatters: 'Google and Bing require pages with hreflang annotations to include a self-referential alternate link.',
        confidence: 'high',
        recommendedFix: `Include <link rel="alternate" hreflang="${page.lang || 'en'}" href="${page.url}"> in the head.`,
        effort: 'quick_win',
        validationInstructions: 'Ensure the hreflang cluster includes the current page URL.',
      });
    }
  }

  // 3. 64-bit SimHash Near-Duplicate Content Clustering
  const nearDuplicateClusters: NearDuplicateCluster[] = [];
  const validHtmlPages = pages.filter(
    (p) => p.isHtml && p.statusCode === 200 && p.wordCount > 50
  );

  const pageSimHashes: Array<{ page: ExtractedPageData; hash: bigint }> = [];
  for (const page of validHtmlPages) {
    const text = page.textSnippet || '';
    if (text.length > 100) {
      pageSimHashes.push({
        page,
        hash: computeSimHash64(text),
      });
    }
  }

  const processedUrls = new Set<string>();

  for (let i = 0; i < pageSimHashes.length; i++) {
    const { page: pA, hash: hA } = pageSimHashes[i];
    if (processedUrls.has(pA.url)) continue;

    const duplicates: string[] = [];
    let minDistance = 64;

    for (let j = i + 1; j < pageSimHashes.length; j++) {
      const { page: pB, hash: hB } = pageSimHashes[j];
      if (processedUrls.has(pB.url)) continue;

      const dist = hammingDistance(hA, hB);
      if (dist <= 7) { // Distance <= 7 (out of 64 bits) indicates >= 85% textual similarity
        duplicates.push(pB.url);
        processedUrls.add(pB.url);
        if (dist < minDistance) minDistance = dist;
      }
    }

    if (duplicates.length > 0) {
      processedUrls.add(pA.url);
      nearDuplicateClusters.push({
        primaryUrl: pA.url,
        duplicateUrls: duplicates,
        distance: minDistance,
      });

      findings.push({
        id: `CONTENT_NEAR_DUPLICATE-${pA.normalizedUrl}`,
        category: 'content',
        severity: 'high',
        title: `Near-Duplicate Content Detected Across ${duplicates.length + 1} Pages (SimHash Distance ${minDistance})`,
        evidence: `Primary URL: ${pA.url} shares near-identical body text with: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? ` and ${duplicates.length - 3} more` : ''}.`,
        affectedUrl: pA.url,
        affectedUrls: [pA.url, ...duplicates],
        whyItMatters: 'Near-duplicate pages dilute internal link equity, cause keyword cannibalization, and waste crawl budget.',
        confidence: 'high',
        recommendedFix: 'Differentiate page content with unique descriptions, specs, and user reviews, or canonicalize duplicate pages to the primary version.',
        effort: 'moderate',
        validationInstructions: 'Compare body content across flagged URLs and verify distinct textual content.',
      });
    }
  }

  return {
    gmcIssuesCount,
    hreflangIssuesCount,
    nearDuplicateClusters,
    findings,
  };
}
