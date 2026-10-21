import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeFacetedAndFallbackUrls(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  // Find homepage
  const homePage = pages.find((p) => {
    try {
      const path = new URL(p.url).pathname;
      return path === '/' || path === '';
    } catch {
      return false;
    }
  });

  const homeTitle = homePage?.title?.trim().toLowerCase();
  const homeDesc = homePage?.metaDescription?.trim().toLowerCase();

  // Map URLs by clean path without query params
  const cleanPathMap = new Map<string, ExtractedPageData>();
  for (const page of pages) {
    try {
      const parsed = new URL(page.url);
      if (!parsed.search) {
        cleanPathMap.set(`${parsed.origin}${parsed.pathname}`, page);
      }
    } catch {}
  }

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(page.url);
    } catch {
      continue;
    }

    const isHomepage = parsedUrl.pathname === '/' || parsedUrl.pathname === '';

    // 1. Metadata Fallback Detection
    if (!isHomepage && homeTitle && page.title) {
      const pageTitleClean = page.title.trim().toLowerCase();
      const pageDescClean = page.metaDescription?.trim().toLowerCase();

      const titleMatchesHome = pageTitleClean === homeTitle;
      const descMatchesHome = homeDesc && pageDescClean === homeDesc;

      if (titleMatchesHome || descMatchesHome) {
        findings.push({
          id: `ONPAGE-METADATA-FALLBACK-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'high',
          title: 'Likely metadata fallback (page-specific metadata missing or failed to load)',
          evidence: `Page at "${page.url}" has ${titleMatchesHome ? `title identical to the homepage ("${page.title}")` : ''}${titleMatchesHome && descMatchesHome ? ' and ' : ''}${descMatchesHome ? `meta description identical to the homepage` : ''}.`,
          affectedUrl: page.url,
          whyItMatters:
            'When dynamic pages fall back to the default homepage metadata, search engines fail to understand page-specific intent, causing duplicate snippet presentation and lower click-through rates in SERPs.',
          confidence: 'high',
          recommendedFix:
            'Implement dynamic page metadata generation. In Next.js App Router, ensure generateMetadata() returns unique titles and descriptions per route without catching errors with silent fallbacks to root layout defaults.',
          implementationExample: `// app/product/[slug]/page.tsx\nexport async function generateMetadata({ params }): Promise<Metadata> {\n  const product = await getProduct(params.slug);\n  if (!product) return { title: 'Product Not Found | Brand' };\n  return {\n    title: \`\${product.name} — Luxury Fragrance Australia\`, \n    description: product.summary,\n  };\n}`,
          effort: 'moderate',
          validationInstructions: 'Verify that the page emits its own distinctive title and description in the HTML head.',
        });
      }
    }

    // 2. Faceted / Query Parameter URL Conflicts
    if (parsedUrl.search) {
      const parentUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
      const parentPage = cleanPathMap.get(parentUrl);

      const hasSelfCanonical =
        page.canonicalUrl &&
        (page.canonicalUrl === page.url || page.canonicalUrl === page.normalizedUrl);
      const isMissingCanonical = !page.canonicalUrl;
      const titleMatchesParent = parentPage && parentPage.title && page.title === parentPage.title;

      if (hasSelfCanonical || (isMissingCanonical && titleMatchesParent)) {
        findings.push({
          id: `INDEX-FACETED-URL-CONFLICT-${page.normalizedUrl}`,
          category: 'technical',
          severity: 'medium',
          title: `Faceted / parameter URL competing with parent page (${parsedUrl.search})`,
          evidence: `Faceted URL "${page.url}" has ${hasSelfCanonical ? 'a self-referencing canonical tag' : 'no canonical tag'} and shares content with parent URL "${parentUrl}".`,
          affectedUrl: page.url,
          whyItMatters:
            'Faceted navigation with sort, filter, or category parameters creates index bloat and keyword cannibalization when self-canonicalized rather than consolidating equity to the parent category page.',
          confidence: 'high',
          recommendedFix: `Point the canonical tag of parameter variations to the clean parent URL ("${parentUrl}"), or apply a "noindex, follow" robots directive.`,
          implementationExample: `<!-- On ${page.url} -->\n<link rel="canonical" href="${parentUrl}" />`,
          effort: 'quick_win',
          validationInstructions: `Inspect canonical on ${page.url} and confirm href points to ${parentUrl}.`,
        });
      }
    }
  }

  return findings;
}
