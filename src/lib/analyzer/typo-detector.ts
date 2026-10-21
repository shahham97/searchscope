import { ExtractedPageData, Finding } from '../../types/audit';

// Common known typographical errors in e-commerce, lifestyle, and web copy
const COMMON_TYPOS: Record<string, string> = {
  freshners: 'fresheners',
  freshner: 'freshener',
  diffusor: 'diffuser',
  diffusors: 'diffusers',
  fragrence: 'fragrance',
  fragrences: 'fragrances',
  perfum: 'perfume',
  artisanel: 'artisanal',
  recieve: 'receive',
  recieved: 'received',
  seperate: 'separate',
  seperated: 'separated',
  accomodate: 'accommodate',
  delievery: 'delivery',
  garantee: 'guarantee',
  gaurentee: 'guarantee',
  definately: 'definitely',
  occured: 'occurred',
  untill: 'until',
  experiance: 'experience',
  experianced: 'experienced',
  catagory: 'category',
  catagories: 'categories',
  colletion: 'collection',
  colletions: 'collections',
  availiable: 'available',
  maintenence: 'maintenance',
  priviledge: 'privilege',
  reccomend: 'recommend',
  reccomended: 'recommended',
  independant: 'independent',
  calender: 'calendar',
  referance: 'reference',
};

export interface DetectedTypo {
  word: string;
  correction: string;
  location: string;
  contextSnippet: string;
  isNavigation: boolean;
}

export function analyzeTextQualityAndTypos(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  // Build brand / domain allowlist
  const allowlist = new Set<string>([
    'attar',
    'oud',
    'oudh',
    'sillage',
    'benzoin',
    'maceration',
    'amber',
    'libre',
    'botanical',
    'diffuser',
    'diffusers',
  ]);

  for (const page of pages) {
    if (page.organizationName) {
      page.organizationName.toLowerCase().split(/\W+/).forEach((w) => w && allowlist.add(w));
    }
    try {
      const hostParts = new URL(page.url).hostname.split('.');
      hostParts.forEach((part) => part && allowlist.add(part.toLowerCase()));
    } catch {}
    if (page.title) {
      page.title.toLowerCase().split(/\W+/).forEach((w) => w.length > 3 && allowlist.add(w));
    }
  }

  // Track site-wide navigation typos to aggregate them into a High severity finding
  const navTypoOccurrences = new Map<string, { correction: string; urls: string[]; snippet: string }>();

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    const pageTypos: DetectedTypo[] = [];

    // Helper to scan a text string
    const scanText = (text: string, location: string, isNav: boolean = false) => {
      if (!text) return;
      const tokens = text.match(/\b[A-Za-z'-]+\b/g) || [];
      for (const token of tokens) {
        const clean = token.toLowerCase();
        if (allowlist.has(clean)) continue;

        if (COMMON_TYPOS[clean]) {
          const correction = COMMON_TYPOS[clean];
          const snippetStart = Math.max(0, text.indexOf(token) - 20);
          const snippetEnd = Math.min(text.length, text.indexOf(token) + token.length + 20);
          const contextSnippet = `"...${text.slice(snippetStart, snippetEnd).trim()}..."`;

          pageTypos.push({
            word: token,
            correction,
            location,
            contextSnippet,
            isNav,
          });

          if (isNav) {
            const key = `${token.toLowerCase()}:${correction}`;
            const existing = navTypoOccurrences.get(key) || { correction, urls: [], snippet: contextSnippet };
            if (!existing.urls.includes(page.url)) existing.urls.push(page.url);
            navTypoOccurrences.set(key, existing);
          }
        }
      }
    };

    // 1. Scan page title & meta description
    if (page.title) scanText(page.title, 'Title Tag');
    if (page.metaDescription) scanText(page.metaDescription, 'Meta Description');

    // 2. Scan headings
    page.h1s.forEach((h1) => scanText(h1, 'H1 Heading'));
    page.h2s.forEach((h2) => scanText(h2, 'H2 Heading'));

    // 3. Scan navigation links & anchor text
    for (const link of page.internalLinks) {
      if (link.anchorText) {
        scanText(link.anchorText, `Navigation Anchor: "${link.anchorText}"`, true);
      }
    }

    // Page-level content typos (excluding navigation which is grouped site-wide)
    const contentTypos = pageTypos.filter((t) => !t.isNav);
    if (contentTypos.length > 0) {
      const summaryList = contentTypos
        .slice(0, 3)
        .map((t) => `• In ${t.location}: "${t.word}" -> change to "${t.correction}" (Context: ${t.contextSnippet})`)
        .join('\n');

      findings.push({
        id: `CONTENT-TYPOS-${page.normalizedUrl}`,
        category: 'content',
        severity: 'medium',
        title: `Spelling or typographical errors in visible copy (${contentTypos.length} errors)`,
        evidence: `Found ${contentTypos.length} likely spelling error(s) in headings, metadata, or prominent text on ${page.url}:\n${summaryList}`,
        affectedUrl: page.url,
        whyItMatters:
          'Spelling errors in titles and headings damage user trust, brand perception, and keyword matching in search queries.',
        confidence: 'high',
        recommendedFix: 'Correct the flagged typos in your content management system or page templates.',
        effort: 'quick_win',
        validationInstructions: 'Inspect the flagged elements and verify the spelling matches standard dictionaries.',
      });
    }
  }

  // Site-wide navigation typos (High severity since they repeat on every URL)
  for (const [key, data] of navTypoOccurrences.entries()) {
    const [misspelling] = key.split(':');
    const firstUrl = data.urls[0] || 'Site-wide navigation';
    findings.push({
      id: `CONTENT-NAV-TYPO-${misspelling}`,
      category: 'content',
      severity: 'high',
      title: `Site-wide navigation typo detected: "${misspelling}" -> "${data.correction}" (${data.urls.length} pages)`,
      evidence: `Navigation menu contains a misspelled anchor label "${misspelling}" (recommended: "${data.correction}"). Detected across ${data.urls.length} pages in the primary navigation. Sample context: ${data.snippet}`,
      affectedUrl: firstUrl,
      whyItMatters:
        'Navigation link labels serve as internal anchor text across every single page. A misspelling in the main navigation degrades site-wide keyword signals and harms brand credibility.',
      confidence: 'high',
      recommendedFix: `Update the navigation link label from "${misspelling}" to "${data.correction}" in your header/navigation component.`,
      implementationExample: `<!-- Navigation Component -->\n- <Link href="/shop/car-fresheners">Car Freshners</Link>\n+ <Link href="/shop/car-fresheners">Car Fresheners</Link>`,
      effort: 'quick_win',
      validationInstructions: `Check header navigation across all pages to confirm "${data.correction}" is used consistently.`,
    });
  }

  return findings;
}
