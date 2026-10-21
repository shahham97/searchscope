import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from '../security/safe-fetch';
import { normalizeUrl } from './url-utils';

export interface SitemapDiscoveryResult {
  sitemapsFound: string[];
  discoveredUrls: string[];
  errors: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false, // keep as strings
});

/**
 * Parses XML sitemap content safely and extracts URLs.
 */
export function parseSitemapXml(xmlContent: string): { urls: string[]; nestedSitemaps: string[] } {
  const urls: string[] = [];
  const nestedSitemaps: string[] = [];

  try {
    const parsed = parser.parse(xmlContent);

    // Case 1: Standard URL set <urlset><url><loc>...</loc></url></urlset>
    if (parsed.urlset && parsed.urlset.url) {
      const urlList = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
      for (const item of urlList) {
        if (item && item.loc && typeof item.loc === 'string') {
          urls.push(item.loc.trim());
        }
      }
    }

    // Case 2: Sitemap index <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const sitemapList = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];
      for (const item of sitemapList) {
        if (item && item.loc && typeof item.loc === 'string') {
          nestedSitemaps.push(item.loc.trim());
        }
      }
    }
  } catch {
    // Malformed XML returns whatever was parsed or empty
  }

  return { urls, nestedSitemaps };
}

/**
 * Discovers sitemap URLs starting from robots.txt declared sitemaps and common default paths
 * with strict limit on recursion depth and total URLs discovered.
 */
export async function discoverSitemapUrls(
  origin: string,
  declaredSitemaps: string[],
  maxUrls: number = 200
): Promise<SitemapDiscoveryResult> {
  const sitemapsToTry = new Set<string>(declaredSitemaps);
  // Common fallback locations
  sitemapsToTry.add(`${origin.replace(/\/+$/, '')}/sitemap.xml`);
  sitemapsToTry.add(`${origin.replace(/\/+$/, '')}/sitemap_index.xml`);

  const visitedSitemaps = new Set<string>();
  const discoveredUrls = new Set<string>();
  const sitemapsFound: string[] = [];
  const errors: string[] = [];

  const queue = Array.from(sitemapsToTry);

  while (queue.length > 0 && visitedSitemaps.size < 5 && discoveredUrls.size < maxUrls) {
    const sitemapUrl = queue.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);

    try {
      const res = await safeFetch(sitemapUrl, { timeoutMs: 5000, maxBytes: 1.5 * 1024 * 1024 });
      if (res.statusCode >= 200 && res.statusCode < 300 && res.body.trim()) {
        sitemapsFound.push(sitemapUrl);
        const { urls, nestedSitemaps } = parseSitemapXml(res.body);

        for (const u of urls) {
          const normalized = normalizeUrl(u, origin);
          if (normalized) {
            discoveredUrls.add(normalized);
            if (discoveredUrls.size >= maxUrls) break;
          }
        }

        for (const nested of nestedSitemaps) {
          if (!visitedSitemaps.has(nested) && queue.length < 5) {
            queue.push(nested);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to fetch sitemap ${sitemapUrl}: ${msg}`);
    }
  }

  return {
    sitemapsFound,
    discoveredUrls: Array.from(discoveredUrls),
    errors,
  };
}
