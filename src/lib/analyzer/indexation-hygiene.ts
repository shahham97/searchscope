import { ExtractedPageData, Finding } from '../../types/audit';

export interface SitemapHygieneReport {
  non200UrlsInSitemap: Array<{ url: string; statusCode: number }>;
  redirectedUrlsInSitemap: Array<{ url: string; redirectTarget: string }>;
  noindexUrlsInSitemap: string[];
  duplicateSitemapUrls: string[];
  outOfStockProductsWith404: string[];
  facetedCrawlTraps: string[];
  findings: Finding[];
}

export function analyzeIndexationHygiene(
  pages: ExtractedPageData[],
  sitemapUrls: string[] = []
): SitemapHygieneReport {
  const findings: Finding[] = [];
  const pageMap = new Map<string, ExtractedPageData>();
  for (const p of pages) {
    pageMap.set(p.url, p);
    pageMap.set(p.normalizedUrl, p);
  }

  const non200UrlsInSitemap: Array<{ url: string; statusCode: number }> = [];
  const redirectedUrlsInSitemap: Array<{ url: string; redirectTarget: string }> = [];
  const noindexUrlsInSitemap: string[] = [];
  const seenSitemapUrls = new Set<string>();
  const duplicateSitemapUrls: string[] = [];

  for (const sUrl of sitemapUrls) {
    if (seenSitemapUrls.has(sUrl)) {
      duplicateSitemapUrls.push(sUrl);
    }
    seenSitemapUrls.add(sUrl);

    const page = pageMap.get(sUrl);
    if (page) {
      if (page.statusCode !== 200 && page.statusCode !== 0) {
        non200UrlsInSitemap.push({ url: sUrl, statusCode: page.statusCode });
      }

      if (page.redirectChain && page.redirectChain.length > 0) {
        redirectedUrlsInSitemap.push({
          url: sUrl,
          redirectTarget: page.redirectChain[page.redirectChain.length - 1],
        });
      }

      if (page.robotsDirectives.some((r) => r.toLowerCase().includes('noindex'))) {
        noindexUrlsInSitemap.push(sUrl);
      }
    }
  }

  // 1. Out-of-stock product handling
  // If a product URL returned 404 or 410 or has soft-404 evidence
  const outOfStockProductsWith404: string[] = [];
  for (const page of pages) {
    const isProduct =
      page.pageType === 'product' ||
      page.url.includes('/product/') ||
      page.url.includes('/products/');

    if (isProduct && (page.statusCode === 404 || page.statusCode === 410)) {
      outOfStockProductsWith404.push(page.url);
    }
  }

  // 2. Faceted navigation URL handling
  const facetedCrawlTraps: string[] = [];
  for (const page of pages) {
    const urlStr = page.url;
    if (urlStr.includes('?')) {
      const qIndex = urlStr.indexOf('?');
      const queryString = urlStr.substring(qIndex + 1);
      const params = new URLSearchParams(queryString);

      if (
        params.has('sort') ||
        params.has('filter') ||
        params.has('color') ||
        params.has('size') ||
        params.has('price') ||
        params.has('tag')
      ) {
        // Flag if missing canonical tag pointing to clean base URL
        if (!page.canonicalUrl || page.canonicalUrl.includes('?')) {
          facetedCrawlTraps.push(page.url);
        }
      }
    }
  }

  // 3. Generate Findings
  if (non200UrlsInSitemap.length > 0) {
    const affected = non200UrlsInSitemap.map((n) => n.url);
    findings.push({
      id: 'SITEMAP_NON_200_URLS',
      category: 'technical',
      severity: 'high',
      title: `${non200UrlsInSitemap.length} Non-200 URL(s) Discovered in XML Sitemap`,
      description: 'The XML sitemap submits URLs that return error status codes (404, 500) rather than valid 200 OK responses.',
      evidence: `Examples: ${non200UrlsInSitemap.slice(0, 3).map((n) => `${n.url} (HTTP ${n.statusCode})`).join(', ')}`,
      affectedUrl: affected[0],
      affectedUrls: affected,
      whyItMatters: 'Search engines downgrade sitemap crawl priority when sitemaps contain broken or non-existent URLs.',
      confidence: 'high',
      recommendedFix: 'Remove non-200 URLs from sitemap.xml or update them to active 200 OK destination URLs.',
      effort: 'quick_win',
      validationInstructions: 'Inspect sitemap.xml to confirm all submitted URLs return HTTP 200.',
    });
  }

  if (redirectedUrlsInSitemap.length > 0) {
    const affected = redirectedUrlsInSitemap.map((r) => r.url);
    findings.push({
      id: 'SITEMAP_REDIRECTED_URLS',
      category: 'technical',
      severity: 'medium',
      title: `${redirectedUrlsInSitemap.length} Redirected URL(s) Included in XML Sitemap`,
      description: 'URLs in XML sitemaps redirect to another location rather than pointing directly to the final canonical URL.',
      evidence: `Example: ${redirectedUrlsInSitemap[0].url} redirects to ${redirectedUrlsInSitemap[0].redirectTarget}`,
      affectedUrl: affected[0],
      affectedUrls: affected,
      whyItMatters: 'Sitemaps must contain only canonical destination URLs; redirected sitemap entries waste crawl budget.',
      confidence: 'high',
      recommendedFix: 'Update sitemap.xml entries to point directly to their final 200 OK destinations.',
      effort: 'quick_win',
      validationInstructions: 'Verify sitemap URLs return 200 directly without 301/302 hops.',
    });
  }

  if (noindexUrlsInSitemap.length > 0) {
    findings.push({
      id: 'SITEMAP_NOINDEX_CONFLICT',
      category: 'technical',
      severity: 'high',
      title: `Conflicting Directives: ${noindexUrlsInSitemap.length} Noindex Page(s) Submitted in Sitemap`,
      description: 'Pages containing a "noindex" meta tag are being submitted in sitemap.xml, creating contradictory signals.',
      evidence: `Affected: ${noindexUrlsInSitemap.slice(0, 3).join(', ')}`,
      affectedUrl: noindexUrlsInSitemap[0],
      affectedUrls: noindexUrlsInSitemap,
      whyItMatters: 'Submitting a page in sitemap.xml requests indexing while noindex requests exclusion, confusing search bots.',
      confidence: 'high',
      recommendedFix: 'Either remove noindex if the page should be indexed, or remove the URL from sitemap.xml.',
      effort: 'quick_win',
      validationInstructions: 'Ensure sitemap entries and page meta robots directives align.',
    });
  }

  if (outOfStockProductsWith404.length > 0) {
    findings.push({
      id: 'ECOMM_OUT_OF_STOCK_404',
      category: 'technical',
      severity: 'medium',
      title: `${outOfStockProductsWith404.length} Product Page(s) Returning 404 Instead of Out-of-Stock Handling`,
      description: 'Product pages return HTTP 404/410 dead responses instead of remaining active with Schema OutOfStock markup.',
      evidence: `Affected product URLs: ${outOfStockProductsWith404.slice(0, 3).join(', ')}`,
      affectedUrl: outOfStockProductsWith404[0],
      affectedUrls: outOfStockProductsWith404,
      whyItMatters: 'Dead product URLs destroy accumulated backlinks, lose organic rankings, and create soft-404 dead ends.',
      confidence: 'medium',
      recommendedFix: 'Keep out-of-stock product pages live with schema availability="https://schema.org/OutOfStock" and recommended alternatives.',
      effort: 'moderate',
      validationInstructions: 'Ensure temporary out-of-stock items remain indexed with clear status.',
    });
  }

  if (facetedCrawlTraps.length > 0) {
    findings.push({
      id: 'FACETED_NAVIGATION_CRAWL_TRAP',
      category: 'technical',
      severity: 'medium',
      title: `${facetedCrawlTraps.length} Faceted Navigation URL(s) Without Canonicalization`,
      description: 'URLs with filter/sort query parameters lack a canonical tag pointing back to the clean category URL.',
      evidence: `Example: ${facetedCrawlTraps[0]}`,
      affectedUrl: facetedCrawlTraps[0],
      affectedUrls: facetedCrawlTraps,
      whyItMatters: 'Faceted URL parameters create infinite duplicate combinations that exhaust crawl budget and cause index bloat.',
      confidence: 'high',
      recommendedFix: 'Add rel="canonical" pointing from faceted URLs to the clean primary category URL.',
      effort: 'quick_win',
      validationInstructions: 'Verify all parameterized collection URLs specify their base category canonical.',
    });
  }

  return {
    non200UrlsInSitemap,
    redirectedUrlsInSitemap,
    noindexUrlsInSitemap,
    duplicateSitemapUrls,
    outOfStockProductsWith404,
    facetedCrawlTraps,
    findings,
  };
}
