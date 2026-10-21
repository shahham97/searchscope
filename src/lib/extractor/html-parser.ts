import * as cheerio from 'cheerio';
import { normalizeUrl, isInternalUrl } from '../crawler/url-utils';
import { ExtractedPageData, StructuredDataItem } from '../../types/audit';

export function calculateFleschKincaid(text: string): number {
  const words = text.match(/\b[A-Za-z]+\b/g) || [];
  if (words.length === 0) return 0;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  let syllableCount = 0;
  for (const word of words) {
    const w = word.toLowerCase();
    if (w.length <= 3) {
      syllableCount += 1;
      continue;
    }
    const syllables = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '')
      .replace(/^y/, '')
      .match(/[aeiouy]{1,2}/g);
    syllableCount += syllables ? syllables.length : 1;
  }

  // Flesch Reading Ease: 206.835 - 1.015 * (total_words / total_sentences) - 84.6 * (total_syllables / total_words)
  const score =
    206.835 -
    1.015 * (words.length / sentenceCount) -
    84.6 * (syllableCount / words.length);

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function parseHtmlContent(
  url: string,
  html: string,
  headers: Record<string, string> = {},
  durationMs: number = 0,
  statusCode: number = 200,
  statusText: string = 'OK'
): ExtractedPageData {
  const $ = cheerio.load(html);
  const baseOrigin = new URL(url).origin;
  const baseHostname = new URL(url).hostname;

  // Metadata
  const title = $('title').first().text().trim() || undefined;
  const metaDescription =
    $('meta[name="description" i]').attr('content')?.trim() ||
    $('meta[property="og:description" i]').attr('content')?.trim() ||
    undefined;

  const canonicalRaw = $('link[rel="canonical" i]').attr('href')?.trim();
  const canonicalUrl = canonicalRaw ? normalizeUrl(canonicalRaw, baseOrigin) || canonicalRaw : undefined;

  const robotsMeta = $('meta[name="robots" i]').attr('content') || '';
  const googlebotMeta = $('meta[name="googlebot" i]').attr('content') || '';
  const xRobots = headers['x-robots-tag'] || '';

  const robotsDirectives: string[] = [];
  for (const tag of [robotsMeta, googlebotMeta, xRobots]) {
    if (tag) {
      tag.split(',').forEach((d) => {
        const item = d.trim().toLowerCase();
        if (item && !robotsDirectives.includes(item)) {
          robotsDirectives.push(item);
        }
      });
    }
  }

  const lang = $('html').attr('lang')?.trim() || undefined;
  const viewport = $('meta[name="viewport" i]').attr('content')?.trim() || undefined;
  const charset = $('meta[charset]').attr('charset') || headers['content-type']?.split('charset=')[1]?.trim() || undefined;

  // Open Graph & Twitter
  const ogTitle = $('meta[property="og:title" i]').attr('content')?.trim();
  const ogDescription = $('meta[property="og:description" i]').attr('content')?.trim();
  const ogImage = $('meta[property="og:image" i]').attr('content')?.trim();
  const ogType = $('meta[property="og:type" i]').attr('content')?.trim();

  // Headings
  const h1s: string[] = [];
  $('h1').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1s.push(text);
  });

  const h2s: string[] = [];
  $('h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });

  const h3s: string[] = [];
  $('h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h3s.push(text);
  });

  const headingIssues: string[] = [];
  if (h1s.length === 0) {
    headingIssues.push('Missing H1 heading tag.');
  } else if (h1s.length > 1) {
    headingIssues.push(`Multiple H1 headings detected (${h1s.length} H1s). Standard SEO hierarchy recommends a single primary H1.`);
  }

  // Heading hierarchy check: Did document have H3s with zero H2s?
  if (h3s.length > 0 && h2s.length === 0) {
    headingIssues.push('Heading level skipped: Document contains H3 elements without any preceding H2.');
  }

  // Links
  const internalLinks: { url: string; anchorText: string }[] = [];
  const externalLinks: { url: string; anchorText: string }[] = [];
  const seenUrls = new Set<string>();

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href')?.trim();
    const anchorText = $(el).text().trim() || $(el).attr('title')?.trim() || '';

    if (!rawHref) return;
    const normalized = normalizeUrl(rawHref, baseOrigin);
    if (!normalized) return;

    if (seenUrls.has(normalized)) return;
    seenUrls.add(normalized);

    if (isInternalUrl(normalized, baseHostname)) {
      internalLinks.push({ url: normalized, anchorText });
    } else {
      externalLinks.push({ url: normalized, anchorText });
    }
  });

  // Images
  const images: ExtractedPageData['images'] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src')?.trim() || '';
    if (!src) return;
    const alt = $(el).attr('alt');
    const loading = $(el).attr('loading')?.toLowerCase();
    const width = $(el).attr('width');
    const height = $(el).attr('height');

    images.push({
      src,
      alt: alt?.trim(),
      hasAlt: typeof alt === 'string' && alt.trim().length > 0,
      isLazy: loading === 'lazy',
      hasExplicitDimensions: Boolean(width && height),
    });
  });

  // Structured Data (JSON-LD)
  const structuredData: StructuredDataItem[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const rawJson = $(el).html()?.trim();
    if (!rawJson) return;

    const errors: string[] = [];
    const warnings: string[] = [];
    const propertiesFound: string[] = [];
    let type = 'Unknown';
    let isValid = false;

    try {
      const parsed = JSON.parse(rawJson);
      isValid = true;

      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === 'object') {
          type = item['@type'] || type;
          propertiesFound.push(...Object.keys(item));

          if (!item['@context']) {
            warnings.push("Missing '@context': 'https://schema.org'");
          }
          if (!item['@type']) {
            errors.push("Missing '@type' declaration in JSON-LD");
          }
        }
      }
    } catch (err: unknown) {
      isValid = false;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Malformed JSON-LD syntax: ${msg}`);
    }

    structuredData.push({
      type: Array.isArray(type) ? type.join(', ') : String(type),
      rawJson,
      isValid,
      errors,
      warnings,
      propertiesFound: Array.from(new Set(propertiesFound)),
    });
  });

  // Clean text content for text analysis
  const textClone = $('body').clone();
  textClone.find('script, style, noscript, svg, nav, footer, header').remove();
  const rawText = textClone.text().replace(/\s+/g, ' ').trim();
  const words = rawText.match(/\b[\w'-]+\b/g) || [];
  const wordCount = words.length;
  const textSnippet = rawText.slice(0, 300);

  const fleschKincaidReadingEase = calculateFleschKincaid(rawText);

  // AEO / GEO content pattern heuristics
  const hasFAQMarkupOrContent =
    structuredData.some((sd) => sd.type.toLowerCase().includes('faq')) ||
    rawText.toLowerCase().includes('frequently asked questions') ||
    $('details, dt, .faq, [class*="faq"]').length > 0;

  const hasDirectDefinitions =
    /\b(is defined as|refers to|is a|are known as|means)\b/i.test(rawText.slice(0, 2000)) ||
    $('dl, dfn').length > 0;

  const hasTablesOrLists = $('table, ol, ul').length > 0;

  const hasAuthorAttribution =
    $('a[rel="author"], .author, [itemprop="author"], meta[name="author"]').length > 0 ||
    /\b(written by|authored by|by [A-Z][a-z]+ [A-Z][a-z]+)\b/i.test(rawText);

  const hasContactOrAboutEvidence =
    $('a[href*="about"], a[href*="contact"], a[href*="privacy"], a[href*="terms"]').length > 0 ||
    /\b(about us|contact us|privacy policy)\b/i.test(rawText);

  // Performance signals
  const isHttps = url.startsWith('https://');
  const hasCompression = Boolean(headers['content-encoding']);
  const cacheControl = headers['cache-control'];
  const renderBlockingResourceCount = $(
    'head script:not([async]):not([defer]):not([type="application/ld+json"]), head link[rel="stylesheet"]'
  ).length;
  const domElementCount = $('*').length;

  return {
    url,
    normalizedUrl: normalizeUrl(url, baseOrigin) || url,
    statusCode,
    statusText,
    fetchDurationMs: durationMs,
    contentType: headers['content-type'] || 'text/html',
    contentLengthBytes: Buffer.byteLength(html, 'utf-8'),
    isHtml: true,

    title,
    titleLength: title ? title.length : 0,
    metaDescription,
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    canonicalUrl,
    robotsDirectives,
    lang,
    viewport,
    charset,

    ogTitle,
    ogDescription,
    ogImage,
    ogType,

    h1s,
    h2s,
    h3s,
    headingHierarchyValid: headingIssues.length === 0,
    headingIssues,

    internalLinks,
    externalLinks,
    brokenInternalLinks: [],

    images,

    wordCount,
    textSnippet,
    detectedEntities: [],
    fleschKincaidReadingEase,
    hasFAQMarkupOrContent,
    hasDirectDefinitions,
    hasTablesOrLists,
    hasAuthorAttribution,
    hasContactOrAboutEvidence,

    structuredData,

    isHttps,
    hasCompression,
    cacheControl,
    renderBlockingResourceCount,
    domElementCount,
  };
}
