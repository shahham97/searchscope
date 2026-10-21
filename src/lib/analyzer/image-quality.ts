import { ExtractedPageData, Finding } from '../../types/audit';

const GENERIC_ALT_TERMS = new Set([
  'image',
  'photo',
  'picture',
  'img',
  'banner',
  'icon',
  'graphic',
  'placeholder',
  'untitled',
  'default',
]);

const FILE_EXTENSION_REGEX = /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i;
const UUID_OR_HASH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9a-f]{16,}$|^[A-Z0-9_-]{20,}$/i;

export interface AltQualityIssue {
  src: string;
  alt: string;
  reason: 'filename' | 'uuid_hash' | 'single_character' | 'generic_word' | 'identical_to_src';
  suggestedAlt: string;
}

export function analyzeImageAltQuality(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    const issues: AltQualityIssue[] = [];
    const fallbackSuggested = page.h1s[0] || (page.title ? page.title.split('|')[0].trim() : 'Product');

    // Count duplicate alts on this page
    const altCounts = new Map<string, number>();
    for (const img of page.images) {
      if (img.alt) {
        const lower = img.alt.toLowerCase().trim();
        altCounts.set(lower, (altCounts.get(lower) || 0) + 1);
      }
    }

    for (const img of page.images) {
      if (!img.alt) continue;
      const cleanAlt = img.alt.trim();
      const lowerAlt = cleanAlt.toLowerCase();

      // 1. Filename / extension (e.g. 30ml.jpg, hero_img.png)
      if (FILE_EXTENSION_REGEX.test(cleanAlt) || cleanAlt.includes('.jpg') || cleanAlt.includes('.png')) {
        issues.push({
          src: img.src,
          alt: cleanAlt,
          reason: 'filename',
          suggestedAlt: `${fallbackSuggested} - detailed view`,
        });
      }
      // 2. UUID or random hash (e.g. 88CA3330-79D1-46CC-A5B3-0594990D3D50 or product_1787777749454_d0bbf5be)
      else if (UUID_OR_HASH_REGEX.test(cleanAlt) || /^[0-9a-fA-F-]{24,}$/.test(cleanAlt)) {
        issues.push({
          src: img.src,
          alt: cleanAlt,
          reason: 'uuid_hash',
          suggestedAlt: `${fallbackSuggested} showcase`,
        });
      }
      // 3. Single character or digit (e.g. "1", "2", "4", "f")
      else if (cleanAlt.length <= 2 && /^[a-zA-Z0-9]{1,2}$/.test(cleanAlt)) {
        issues.push({
          src: img.src,
          alt: cleanAlt,
          reason: 'single_character',
          suggestedAlt: `${fallbackSuggested} view ${cleanAlt}`,
        });
      }
      // 4. Generic placeholder words
      else if (GENERIC_ALT_TERMS.has(lowerAlt)) {
        issues.push({
          src: img.src,
          alt: cleanAlt,
          reason: 'generic_word',
          suggestedAlt: `${fallbackSuggested} featured photograph`,
        });
      }
      // 5. Identical to src
      else if (cleanAlt === img.src || cleanAlt === img.src.split('/').pop()) {
        issues.push({
          src: img.src,
          alt: cleanAlt,
          reason: 'identical_to_src',
          suggestedAlt: `${fallbackSuggested} presentation`,
        });
      }
    }

    // Check for excessive duplicate alts on the page (more than 4 images with identical non-empty alt)
    const duplicateAlts: string[] = [];
    for (const [altText, count] of altCounts.entries()) {
      if (count >= 4 && altText.length > 2) {
        duplicateAlts.push(`"${altText}" (used ${count} times)`);
      }
    }

    if (issues.length > 0) {
      const sampleList = issues
        .slice(0, 4)
        .map((iss) => `• Alt: "${iss.alt}" (${iss.reason}) -> Suggested: "${iss.suggestedAlt}" (Image: ${iss.src})`)
        .join('\n');

      findings.push({
        id: `ONPAGE-IMAGE-ALT-QUALITY-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'medium',
        title: `Low-quality image alt text detected (${issues.length} images affected)`,
        evidence: `Found ${issues.length} image(s) using file names, UUID hashes, single digits, or generic labels as alt text on ${page.url}:\n${sampleList}`,
        affectedUrl: page.url,
        whyItMatters:
          'Alt text containing raw filenames, database UUIDs, or single digits fails accessibility guidelines (WCAG 2.2) and forfeits image search visibility on Google Images.',
        confidence: 'high',
        recommendedFix:
          'Replace meaningless filenames and hashes with descriptive alt text reflecting the subject, materials, or context of the image.',
        implementationExample: `<img src="/sample.jpg" alt="${fallbackSuggested} artisanal bottle packaging" />`,
        effort: 'quick_win',
        validationInstructions:
          'Inspect image tags and verify alt text describes the visible content rather than file names or database IDs.',
      });
    }

    if (duplicateAlts.length > 0) {
      findings.push({
        id: `ONPAGE-IMAGE-ALT-DUPLICATE-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'low',
        title: `Repetitive image alt text on page (${duplicateAlts.length} repeated phrases)`,
        evidence: `The following alt texts are repeated across multiple distinct images on this page: ${duplicateAlts.join('; ')}`,
        affectedUrl: page.url,
        whyItMatters:
          'Using identical alt text across every gallery or thumbnail image prevents screen reader users from distinguishing angles or product variations.',
        confidence: 'medium',
        recommendedFix: 'Differentiate alt text for each image (e.g. "Front view", "Packaging", "Ingredient swatch").',
        effort: 'quick_win',
        validationInstructions: 'Ensure image alt attributes provide distinctive context for each angle.',
      });
    }
  }

  return findings;
}
