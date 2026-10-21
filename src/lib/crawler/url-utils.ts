export interface UrlNormalizationOptions {
  stripQueryParameters?: boolean;
  stripTrackingParams?: boolean;
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  '_ga',
  'ref',
  'source',
]);

/**
 * Normalizes a URL for canonical crawling and comparison.
 */
export function normalizeUrl(rawUrl: string, baseOrigin?: string): string | null {
  try {
    let clean = rawUrl.trim();
    if (!clean) return null;

    // Reject mailto, javascript, tel, data URIs
    if (
      clean.startsWith('javascript:') ||
      clean.startsWith('mailto:') ||
      clean.startsWith('tel:') ||
      clean.startsWith('data:') ||
      clean.startsWith('#')
    ) {
      return null;
    }

    const parsed = baseOrigin ? new URL(clean, baseOrigin) : new URL(clean);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Lowercase host
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove hash/fragment
    parsed.hash = '';

    // Strip common tracking query params
    const searchParams = new URLSearchParams(parsed.search);
    let modified = false;
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        searchParams.delete(key);
        modified = true;
      }
    }
    if (modified) {
      parsed.search = searchParams.toString();
    }

    // Standardize trailing slash on path (remove trailing slash unless it's just root '/')
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Checks if a given URL is internal to the base domain.
 */
export function isInternalUrl(
  urlToCheck: string,
  baseDomain: string,
  allowSubdomains: boolean = false
): boolean {
  try {
    const parsed = new URL(urlToCheck);
    const host = parsed.hostname.toLowerCase();
    const base = baseDomain.toLowerCase();

    if (host === base) return true;
    if (allowSubdomains && host.endsWith(`.${base}`)) return true;

    // Check www vs non-www
    if (base.startsWith('www.') && host === base.substring(4)) return true;
    if (host.startsWith('www.') && host.substring(4) === base) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Extracts the base hostname from a URL string or domain input.
 */
export function extractHostname(input: string): string {
  let clean = input.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  try {
    const parsed = new URL(clean);
    return parsed.hostname;
  } catch {
    return input;
  }
}
