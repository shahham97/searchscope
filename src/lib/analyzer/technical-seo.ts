import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeTechnicalSeo(
  pages: ExtractedPageData[],
  sitemapsFound: string[],
  robotsTxtPresent: boolean
): Finding[] {
  const findings: Finding[] = [];

  // 1. Robots.txt check
  if (!robotsTxtPresent) {
    findings.push({
      id: 'TECH-ROBOTS-MISSING',
      category: 'technical',
      severity: 'medium',
      title: 'Missing robots.txt file',
      evidence: 'No accessible robots.txt file was detected at the website root.',
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'A robots.txt file informs search engine crawlers and answer engine bots about which areas of your site should and should not be crawled.',
      confidence: 'high',
      recommendedFix:
        'Create a robots.txt file at the root directory of your web server with standard directives and your sitemap location.',
      implementationExample: `User-agent: *\nAllow: /\n\nSitemap: ${pages[0] ? new URL(pages[0].url).origin : 'https://example.com'}/sitemap.xml`,
      effort: 'quick_win',
      validationInstructions:
        'Verify that fetching https://yourdomain.com/robots.txt returns HTTP 200 with appropriate directives.',
    });
  }

  // 2. Sitemap check
  if (sitemapsFound.length === 0) {
    findings.push({
      id: 'TECH-SITEMAP-MISSING',
      category: 'technical',
      severity: 'high',
      title: 'No XML Sitemap detected',
      evidence:
        'Neither robots.txt nor default paths (/sitemap.xml, /sitemap_index.xml) provided an accessible XML sitemap.',
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'XML sitemaps provide search engines with an authoritative inventory of discoverable canonical URLs, update frequencies, and priority.',
      confidence: 'high',
      recommendedFix:
        'Generate a dynamic or static XML sitemap containing all indexable canonical URLs and declare it in robots.txt.',
      implementationExample: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${pages[0]?.url || 'https://example.com/'}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>\n</urlset>`,
      effort: 'moderate',
      validationInstructions:
        'Test the XML sitemap URL in a browser and submit it to Google Search Console.',
    });
  }

  // Build lookup of crawled URLs and statuses
  const urlStatusMap = new Map<string, number>();
  for (const p of pages) {
    urlStatusMap.set(p.normalizedUrl, p.statusCode);
  }

  // Page-level checks
  for (const page of pages) {
    // 3. HTTP Errors (4xx, 5xx)
    if (page.statusCode >= 400) {
      findings.push({
        id: `TECH-HTTP-STATUS-${page.statusCode}-${page.normalizedUrl}`,
        category: 'technical',
        severity: page.statusCode >= 500 ? 'critical' : 'high',
        title: `HTTP ${page.statusCode} Error returned`,
        evidence: `Page returned HTTP status code ${page.statusCode} (${page.statusText}).`,
        affectedUrl: page.url,
        whyItMatters:
          'Error responses block search engines from indexing the page and degrade user experience when visitors click internal or external links.',
        confidence: 'high',
        recommendedFix:
          page.statusCode === 404
            ? 'Ensure this URL is either restored, 301-redirected to a relevant active page, or unlinked from navigation.'
            : 'Investigate web server logs for application exceptions or server configuration failures.',
        effort: 'moderate',
        validationInstructions: `Send an HTTP HEAD/GET request to ${page.url} and confirm an HTTP 200 response or appropriate 301 redirect.`,
      });
    }

    // 4. Broken internal links
    const brokenLinksOnPage: string[] = [];
    for (const link of page.internalLinks) {
      const status = urlStatusMap.get(link.url);
      if (status !== undefined && status >= 400) {
        brokenLinksOnPage.push(`${link.url} (HTTP ${status})`);
      }
    }
    if (brokenLinksOnPage.length > 0) {
      findings.push({
        id: `TECH-BROKEN-LINKS-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'high',
        title: `Broken internal links detected (${brokenLinksOnPage.length} broken targets)`,
        evidence: `Page links to dead internal destination(s): ${brokenLinksOnPage.slice(0, 3).join(', ')}${brokenLinksOnPage.length > 3 ? '...' : ''}`,
        affectedUrl: page.url,
        whyItMatters:
          'Broken internal links waste search bot crawl budget, disrupt user navigation journeys, and leak link equity.',
        confidence: 'high',
        recommendedFix:
          'Update the anchor tags pointing to these URLs to their correct updated destinations or remove obsolete links.',
        effort: 'quick_win',
        validationInstructions:
          'Re-crawl the affected page and verify zero internal links return 4xx or 5xx codes.',
      });
    }

    // 5. HTTPS Consistency
    if (!page.isHttps) {
      findings.push({
        id: `TECH-INSECURE-HTTP-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'critical',
        title: 'Insecure HTTP protocol used',
        evidence: `Page was fetched over unencrypted HTTP: ${page.url}`,
        affectedUrl: page.url,
        whyItMatters:
          'HTTPS is an established ranking signal and security baseline. Browsers flag insecure HTTP pages with security warnings.',
        confidence: 'high',
        recommendedFix:
          'Configure your web server or CDN to enforce TLS 1.3/1.2 and automatically redirect all HTTP traffic to HTTPS via 301 Permanent Redirect.',
        implementationExample:
          '# Nginx redirect block\nserver {\n  listen 80;\n  server_name example.com;\n  return 301 https://$host$request_uri;\n}',
        effort: 'moderate',
        validationInstructions: 'Request the HTTP version with curl -I and verify HTTP 301 redirect to https://.',
      });
    }

    // 6. Canonical URL Issues
    if (!page.canonicalUrl && page.isHtml && page.statusCode === 200) {
      findings.push({
        id: `TECH-CANONICAL-MISSING-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: 'Missing canonical URL tag',
        evidence: 'HTML does not declare a <link rel="canonical"> element.',
        affectedUrl: page.url,
        whyItMatters:
          'Without a canonical declaration, search engines must guess which URL version (with or without query parameters, trailing slashes, or www) is authoritative.',
        confidence: 'high',
        recommendedFix: `Add a self-referencing canonical tag pointing to the authoritative URL: <link rel="canonical" href="${page.normalizedUrl}" />`,
        implementationExample: `<link rel="canonical" href="${page.normalizedUrl}" />`,
        effort: 'quick_win',
        validationInstructions:
          'Inspect the HTML <head> and confirm the canonical tag is present and points to the intended URL.',
      });
    } else if (page.canonicalUrl && !page.canonicalUrl.startsWith('http')) {
      findings.push({
        id: `TECH-CANONICAL-RELATIVE-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: 'Relative canonical URL used',
        evidence: `Canonical tag specifies a relative path (${page.canonicalUrl}) rather than an absolute URL.`,
        affectedUrl: page.url,
        whyItMatters:
          'Relative canonical URLs can be misinterpreted if pages are mirrored or rendered under different subdomains or protocols.',
        confidence: 'high',
        recommendedFix: `Change the canonical URL to an absolute URL with scheme and host: <link rel="canonical" href="${page.normalizedUrl}" />`,
        effort: 'quick_win',
        validationInstructions: 'Confirm the canonical href begins with https://.',
      });
    }

    // 7. Noindex directive
    if (page.robotsDirectives.includes('noindex')) {
      findings.push({
        id: `TECH-NOINDEX-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'informational',
        title: 'Page explicitly instructs search engines not to index (noindex)',
        evidence: `Robots directives detected: ${page.robotsDirectives.join(', ')}`,
        affectedUrl: page.url,
        whyItMatters:
          'A noindex directive intentionally prevents search engines from displaying this page in search results. Ensure this is intentional.',
        confidence: 'high',
        recommendedFix:
          'If this page is intended for public search visibility, remove the "noindex" directive from the meta tag or X-Robots-Tag header.',
        effort: 'quick_win',
        validationInstructions:
          'Check the <meta name="robots"> tag and response headers to confirm noindex is removed.',
      });
    }

    // 8. Mobile Viewport
    if (!page.viewport && page.isHtml && page.statusCode === 200) {
      findings.push({
        id: `TECH-VIEWPORT-MISSING-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'high',
        title: 'Missing responsive viewport meta tag',
        evidence: 'No <meta name="viewport"> tag found in HTML <head>.',
        affectedUrl: page.url,
        whyItMatters:
          'Google uses mobile-first indexing. Pages without a responsive viewport render with desktop scaling on mobile devices, degrading Core Web Vitals and search rankings.',
        confidence: 'high',
        recommendedFix: 'Add standard responsive viewport meta tag to the <head>.',
        implementationExample: '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        effort: 'quick_win',
        validationInstructions: 'Verify viewport meta tag exists in HTML <head>.',
      });
    }

    // 9. Soft-404 Candidate
    if (page.statusCode === 200 && page.isHtml) {
      const lowerText = page.textSnippet.toLowerCase();
      const lowerTitle = (page.title || '').toLowerCase();
      const isSoft404 =
        (lowerTitle.includes('404') ||
          lowerTitle.includes('page not found') ||
          lowerTitle.includes('not found') ||
          lowerTitle.includes('item not found')) &&
        (lowerText.includes('page could not be found') ||
          lowerText.includes('404') ||
          lowerText.includes('does not exist') ||
          lowerText.includes('no products found'));

      if (isSoft404) {
        findings.push({
          id: `TECH-SOFT-404-${page.normalizedUrl}`,
          category: 'technical',
          severity: 'high',
          title: 'Soft 404 detected (HTTP 200 on missing content page)',
          evidence: `Page returned HTTP 200 OK status code but page title and content indicate missing or non-existent content.`,
          affectedUrl: page.url,
          whyItMatters:
            'Search engines identify soft-404s and may refuse to index them while wasting crawl resources. Proper 404 status codes prevent indexing errors.',
          confidence: 'high',
          recommendedFix:
            'Configure your web server/router to return a true HTTP 404 (Not Found) or 410 (Gone) status code for non-existent pages.',
          effort: 'moderate',
          validationInstructions: 'Request the URL and check headers to confirm HTTP 404 status code.',
        });
      }
    }
  }

  return findings;
}
