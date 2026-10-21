import { ExtractedPageData, Finding } from '../../types/audit';

export interface CanonicalAnalysisOptions {
  sitemapsFound?: string[];
  sitemapDiscoveredUrls?: string[];
}

export function analyzeCanonicalsAndHosts(
  pages: ExtractedPageData[],
  options: CanonicalAnalysisOptions = {}
): Finding[] {
  const findings: Finding[] = [];

  // Build lookup maps
  const pageMap = new Map<string, ExtractedPageData>();
  const statusMap = new Map<string, number>();
  const noindexSet = new Set<string>();

  for (const p of pages) {
    pageMap.set(p.url, p);
    pageMap.set(p.normalizedUrl, p);
    statusMap.set(p.url, p.statusCode);
    statusMap.set(p.normalizedUrl, p.statusCode);
    if (p.robotsDirectives.includes('noindex')) {
      noindexSet.add(p.url);
      noindexSet.add(p.normalizedUrl);
    }
  }

  // Extract sitemap host if discovered
  const sitemapUrls = options.sitemapDiscoveredUrls || options.sitemapsFound || [];
  const sitemapHosts = new Set<string>();
  for (const sUrl of sitemapUrls) {
    try {
      sitemapHosts.add(new URL(sUrl).host.toLowerCase());
    } catch {}
  }

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    let servedUrlParsed: URL;
    try {
      servedUrlParsed = new URL(page.url);
    } catch {
      continue;
    }

    const servedHost = servedUrlParsed.host.toLowerCase();
    const servedScheme = servedUrlParsed.protocol;
    const servedPath = servedUrlParsed.pathname;

    // 1. Missing Canonical
    if (!page.canonicalUrl) {
      findings.push({
        id: `CANONICAL-MISSING-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: 'Missing <link rel="canonical"> tag',
        evidence: `Page served at ${page.url} does not declare a canonical URL tag in HTML <head>.`,
        affectedUrl: page.url,
        whyItMatters:
          'Without a canonical declaration, search engines must independently guess which URL variation is authoritative, diluting ranking signals.',
        confidence: 'high',
        recommendedFix: `Add a self-referencing canonical tag to the document <head>.`,
        implementationExample: `<!-- Generic HTML -->\n<link rel="canonical" href="${page.url}" />\n\n// Next.js App Router (app/layout.tsx or page.tsx)\nexport const metadata = {\n  metadataBase: new URL('${servedUrlParsed.origin}'),\n  alternates: {\n    canonical: '${servedPath}',\n  },\n};`,
        effort: 'quick_win',
        validationInstructions: `Inspect <head> at ${page.url} and verify <link rel="canonical" href="${page.url}"> is present.`,
      });
      continue;
    }

    // 2. Multiple Canonicals
    if (page.multipleCanonicalsCount && page.multipleCanonicalsCount > 1) {
      findings.push({
        id: `CANONICAL-MULTIPLE-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'high',
        title: `Multiple conflicting canonical tags declared (${page.multipleCanonicalsCount} tags found)`,
        evidence: `Document contains ${page.multipleCanonicalsCount} separate <link rel="canonical"> tags. Search engines completely ignore canonical signals when conflicting tags exist.`,
        affectedUrl: page.url,
        whyItMatters:
          'When multiple canonical URLs are detected, Google disregards all canonical directives on the page, treating the page as un-canonicalized.',
        confidence: 'high',
        recommendedFix: 'Remove duplicate canonical link tags so that exactly one authoritative canonical tag remains in <head>.',
        effort: 'quick_win',
        validationInstructions: 'Inspect DOM and ensure exactly one <link rel="canonical"> tag exists.',
      });
    }

    // 3. Canonical in <body>
    if (page.hasCanonicalInBody) {
      findings.push({
        id: `CANONICAL-IN-BODY-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: '<link rel="canonical"> placed outside of <head>',
        evidence: `A canonical tag was detected inside the document <body>. Search engines strictly require canonical declarations to reside in the HTML <head>.`,
        affectedUrl: page.url,
        whyItMatters:
          'Search engines ignore canonical tags found in the <body> due to security restrictions preventing user-generated content from manipulating canonicalization.',
        confidence: 'high',
        recommendedFix: 'Move the <link rel="canonical"> tag into the HTML <head> section.',
        effort: 'quick_win',
        validationInstructions: 'Verify that the canonical element appears exclusively inside <head>.',
      });
    }

    // 4. Relative Canonical
    if (!page.canonicalUrl.startsWith('http://') && !page.canonicalUrl.startsWith('https://')) {
      findings.push({
        id: `CANONICAL-RELATIVE-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: 'Relative canonical URL used instead of absolute URL',
        evidence: `Canonical href is specified as a relative path ("${page.canonicalUrl}") rather than a fully qualified absolute URL with scheme and domain.`,
        affectedUrl: page.url,
        whyItMatters:
          'Relative canonical tags are prone to misinterpretation across subdomains, proxies, CDN edges, and protocol hops.',
        confidence: 'high',
        recommendedFix: `Specify the absolute URL with protocol and host: https://${servedHost}${page.canonicalUrl.startsWith('/') ? '' : '/'}${page.canonicalUrl}`,
        implementationExample: `// Next.js App Router metadataBase ensures absolute canonical URLs\nexport const metadata = {\n  metadataBase: new URL('https://${servedHost}'),\n  alternates: {\n    canonical: '${page.canonicalUrl}',\n  },\n};`,
        effort: 'quick_win',
        validationInstructions: 'Verify canonical href starts with https://.',
      });
      continue;
    }

    // Parse canonical URL
    let canonicalParsed: URL;
    try {
      canonicalParsed = new URL(page.canonicalUrl);
    } catch {
      continue;
    }

    const canonicalHost = canonicalParsed.host.toLowerCase();
    const canonicalScheme = canonicalParsed.protocol;
    const canonicalPath = canonicalParsed.pathname;

    // 5. Host & Scheme Mismatches (Apex vs WWW, HTTP vs HTTPS)
    const hostMismatch = canonicalHost !== servedHost;
    const schemeMismatch = canonicalScheme !== servedScheme;

    if (hostMismatch || schemeMismatch) {
      // Check if canonical URL is known to redirect back to served URL (e.g. apex -> www redirect)
      const isApexWwwPair =
        (servedHost === `www.${canonicalHost}` || canonicalHost === `www.${servedHost}`);

      // Check redirect chain evidence
      const hasRedirectBack =
        isApexWwwPair ||
        (page.redirectChain &&
          page.redirectChain.some((hop) => {
            try {
              return new URL(hop).host.toLowerCase() === canonicalHost;
            } catch {
              return false;
            }
          }));

      if (hasRedirectBack) {
        findings.push({
          id: `CANONICAL-POINTS-TO-REDIRECT-${page.normalizedUrl}`,
          category: 'technical',
          severity: 'high',
          title: `Canonical points to a URL that redirects (${canonicalHost} -> ${servedHost})`,
          evidence: `Page is served at "${page.url}", but its <link rel="canonical"> specifies "${page.canonicalUrl}". Requesting "${page.canonicalUrl}" redirects back to "${page.url}", creating an invalid circular canonical signal.`,
          affectedUrl: page.url,
          whyItMatters:
            'Search engines ignore canonical tags pointing to redirecting URLs. When the canonical URL redirects to the served page, search engines encounter a circular signal and may index the wrong host or drop ranking signals.',
          confidence: 'high',
          recommendedFix: `Update the canonical URL tag to reference the final served host directly (${servedHost}). In Next.js, set metadataBase to "https://${servedHost}".`,
          implementationExample: `// Next.js App Router (app/layout.tsx)\nexport const metadata = {\n  metadataBase: new URL('https://${servedHost}'),\n  alternates: {\n    canonical: '${servedPath}',\n  },\n};\n\n<!-- Generic HTML -->\n<link rel="canonical" href="https://${servedHost}${servedPath}" />`,
          effort: 'quick_win',
          validationInstructions: `Inspect HTML <head> and verify <link rel="canonical"> uses "https://${servedHost}" without redirect hops.`,
        });
      } else {
        findings.push({
          id: `CANONICAL-HOST-MISMATCH-${page.normalizedUrl}`,
          category: 'technical',
          severity: 'high',
          title: `Canonical host or scheme differs from final served URL`,
          evidence: `Served URL is "${page.url}" (${servedScheme}//${servedHost}), but canonical tag specifies "${page.canonicalUrl}" (${canonicalScheme}//${canonicalHost}).`,
          affectedUrl: page.url,
          whyItMatters:
            'Cross-domain or cross-scheme canonicals signal that the page should not be indexed on this domain, passing indexing authority to another host.',
          confidence: 'high',
          recommendedFix: `Align the canonical host and scheme with the authoritative destination URL: https://${servedHost}${canonicalPath}`,
          implementationExample: `<link rel="canonical" href="https://${servedHost}${canonicalPath}" />`,
          effort: 'quick_win',
          validationInstructions: 'Verify canonical URL matches the exact served hostname and HTTPS protocol.',
        });
      }
    }

    // 6. Canonical pointing to a non-200 or noindex URL
    const canonicalStatus = statusMap.get(page.canonicalUrl);
    if (canonicalStatus !== undefined && canonicalStatus >= 400) {
      findings.push({
        id: `CANONICAL-POINTS-TO-ERROR-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'high',
        title: `Canonical URL points to an error page (HTTP ${canonicalStatus})`,
        evidence: `Canonical destination "${page.canonicalUrl}" returns HTTP ${canonicalStatus}.`,
        affectedUrl: page.url,
        whyItMatters:
          'When a canonical tag points to a 404 or 500 error page, search engines drop the page from the index entirely.',
        confidence: 'high',
        recommendedFix: 'Update the canonical tag to point to an active, HTTP 200 indexable page.',
        effort: 'quick_win',
        validationInstructions: `curl -I ${page.canonicalUrl} and confirm HTTP 200 response.`,
      });
    }

    if (noindexSet.has(page.canonicalUrl) && page.canonicalUrl !== page.url) {
      findings.push({
        id: `CANONICAL-POINTS-TO-NOINDEX-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'high',
        title: 'Canonical URL points to a noindex page',
        evidence: `Canonical tag specifies "${page.canonicalUrl}", which contains a "noindex" robots directive.`,
        affectedUrl: page.url,
        whyItMatters:
          'Pointing a canonical to a noindexed page signals search engines to remove both pages from the search index.',
        confidence: 'high',
        recommendedFix: 'Remove noindex from the target page or point canonical to a valid indexable URL.',
        effort: 'quick_win',
        validationInstructions: 'Check robots directives on canonical target.',
      });
    }

    // 7. Sitemap host vs Canonical host check
    if (sitemapHosts.size > 0 && !sitemapHosts.has(canonicalHost)) {
      const sampleSitemapHost = Array.from(sitemapHosts)[0];
      findings.push({
        id: `CANONICAL-SITEMAP-HOST-CONFLICT-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'high',
        title: `Sitemap URL host conflicts with canonical URL host (${sampleSitemapHost} vs ${canonicalHost})`,
        evidence: `XML sitemap URLs use host "${sampleSitemapHost}", while page canonical specifies host "${canonicalHost}".`,
        affectedUrl: page.url,
        whyItMatters:
          'Conflicting host declarations between sitemaps and canonical tags cause indexation churn and search console indexing warnings.',
        confidence: 'high',
        recommendedFix: `Unify your domain configuration so both sitemap <loc> URLs and <link rel="canonical"> tags reference "https://${servedHost}".`,
        effort: 'moderate',
        validationInstructions: 'Compare sitemap XML entries with page canonical tags.',
      });
    }

    // 8. Open Graph & Twitter image/url host check
    if (page.ogUrl) {
      try {
        const ogUrlHost = new URL(page.ogUrl).host.toLowerCase();
        if (ogUrlHost !== servedHost && (ogUrlHost === canonicalHost || isSameDomainOrSubdomain(ogUrlHost, servedHost))) {
          findings.push({
            id: `SOCIAL-OG-URL-HOST-MISMATCH-${page.normalizedUrl}`,
            category: 'onpage',
            severity: 'medium',
            title: 'Open Graph URL (og:url) host mismatch',
            evidence: `Page is served at "${servedHost}", but <meta property="og:url"> specifies "${page.ogUrl}" (${ogUrlHost}).`,
            affectedUrl: page.url,
            whyItMatters:
              'Social platforms and chat unfurlers (Slack, iMessage, Twitter) rely on og:url to aggregate share counters and canonical bookmarks.',
            confidence: 'high',
            recommendedFix: `Update og:url to match the served canonical URL: https://${servedHost}${servedPath}`,
            implementationExample: `<meta property="og:url" content="https://${servedHost}${servedPath}" />`,
            effort: 'quick_win',
            validationInstructions: 'Inspect og:url meta tag in page source.',
          });
        }
      } catch {}
    }

    if (page.ogImage) {
      try {
        const ogImageHost = new URL(page.ogImage, page.url).host.toLowerCase();
        if (ogImageHost !== servedHost && isSameDomainOrSubdomain(ogImageHost, servedHost)) {
          findings.push({
            id: `SOCIAL-OG-IMAGE-HOST-MISMATCH-${page.normalizedUrl}`,
            category: 'onpage',
            severity: 'low',
            title: 'Open Graph image references redirecting domain host',
            evidence: `Social share image (${page.ogImage}) uses host "${ogImageHost}" while page is served from "${servedHost}".`,
            affectedUrl: page.url,
            whyItMatters:
              'Loading social card images across domain redirect hops causes preview latency and can prevent social cards from displaying properly.',
            confidence: 'medium',
            recommendedFix: `Use absolute URLs on the primary served domain: https://${servedHost}/...`,
            effort: 'quick_win',
            validationInstructions: 'Verify og:image URL resolves with HTTP 200 on primary domain.',
          });
        }
      } catch {}
    }
  }

  return findings;
}

function isSameDomainOrSubdomain(h1: string, h2: string): boolean {
  if (h1 === h2) return true;
  if (h1 === `www.${h2}` || h2 === `www.${h1}`) return true;
  return false;
}
