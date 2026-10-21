import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeWeakAndAmbiguousLinks(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    // Track anchor texts to target URLs on this page
    const anchorToUrls = new Map<string, Set<string>>();

    for (const link of page.internalLinks) {
      const text = link.anchorText?.trim();
      if (!text || text.length < 2) continue;

      // Filter out utility anchors like "home", "cart", etc.
      if (/^(home|cart|checkout|login|menu|back|shop all)$/i.test(text)) continue;

      const existing = anchorToUrls.get(text) || new Set<string>();
      existing.add(link.url);
      anchorToUrls.set(text, existing);
    }

    const ambiguousItems: { text: string; targets: string[]; suggestion: string }[] = [];

    for (const [anchorText, targets] of anchorToUrls.entries()) {
      if (targets.size > 1) {
        const targetList = Array.from(targets);
        // Generate disambiguation suggestion
        const disambiguated = targetList
          .map((url) => {
            const lastPart = url.split('/').filter(Boolean).pop() || '';
            const readable = lastPart.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return `"${readable}"`;
          })
          .join(' vs ');

        ambiguousItems.push({
          text: anchorText,
          targets: targetList,
          suggestion: disambiguated,
        });
      }
    }

    if (ambiguousItems.length > 0) {
      const summary = ambiguousItems
        .slice(0, 3)
        .map(
          (item) =>
            `• Anchor "${item.text}" links to multiple destinations:\n    - ${item.targets.join('\n    - ')}\n    Suggested disambiguation: ${item.suggestion}`
        )
        .join('\n');

      findings.push({
        id: `LINKS-AMBIGUOUS-ANCHOR-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'medium',
        title: `Ambiguous link text: identical anchor labels pointing to different destinations`,
        evidence: `Page at ${page.url} uses identical link text for multiple distinct destination URLs:\n${summary}`,
        affectedUrl: page.url,
        whyItMatters:
          'Using identical anchor text (such as "Men" or "View Collection") to link to multiple different destination pages confuses users and sends ambiguous relevance signals to search engine topic parsers.',
        confidence: 'high',
        recommendedFix:
          'Disambiguate anchor labels to specify the category or product type (e.g. "Men\'s Scented Oils" vs "Men\'s Car Fresheners").',
        implementationExample: `<Link href="/shop/car-fresheners-men">Men's Car Fresheners</Link>\n<Link href="/shop/scented-oils-men">Men's Perfume Oils</Link>`,
        effort: 'quick_win',
        validationInstructions:
          'Inspect navigation cards on the page and ensure each card label uniquely describes its specific destination.',
      });
    }
  }

  return findings;
}
