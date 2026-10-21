import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

export interface IpValidationResult {
  isValid: boolean;
  ip?: string;
  reason?: string;
}

const ALLOWED_PORTS = new Set(['80', '443', '8080', '8443']);

/**
 * Checks whether an IP address belongs to private, loopback, link-local,
 * multicast, carrier-grade NAT, or cloud metadata ranges.
 */
export function isPrivateOrReservedIp(ipString: string): boolean {
  try {
    const addr = ipaddr.parse(ipString);
    const range = addr.range();

    // Standard ranges considered private/reserved in ipaddr.js:
    const blockedRanges = [
      'loopback',
      'private',
      'linkLocal',
      'carrierGradeNat',
      'uniqueLocal',
      'broadcast',
      'multicast',
      'reserved',
      'unspecified',
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    // Explicit checks for IPv4 ranges
    if (addr.kind() === 'ipv4') {
      const octets = (addr as ipaddr.IPv4).octets;
      // 169.254.0.0/16 Link-local / Cloud metadata
      if (octets[0] === 169 && octets[1] === 254) {
        return true;
      }
      // 0.0.0.0/8 Current network
      if (octets[0] === 0) {
        return true;
      }
      // 127.0.0.0/8 Loopback
      if (octets[0] === 127) {
        return true;
      }
      // 10.0.0.0/8 Private
      if (octets[0] === 10) {
        return true;
      }
      // 172.16.0.0/12 Private
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
        return true;
      }
      // 192.168.0.0/16 Private
      if (octets[0] === 192 && octets[1] === 168) {
        return true;
      }
      // 100.64.0.0/10 Carrier-grade NAT
      if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
        return true;
      }
    } else if (addr.kind() === 'ipv6') {
      const ipv6 = addr as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
        const mappedV4 = ipv6.toIPv4Address();
        return isPrivateOrReservedIp(mappedV4.toString());
      }
      // ::1 loopback and :: unspecified
      if (ipv6.toString() === '::1' || ipv6.toString() === '::') {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Validates a hostname and ensures all its resolved IPv4 and IPv6 addresses
 * are safe and non-private.
 */
// Short in-memory DNS cache to protect against rapid-fire OS resolver saturation (TTL: 60s)
const dnsSafetyCache = new Map<string, { result: IpValidationResult; expiry: number }>();

export async function validateHostSafety(hostname: string): Promise<IpValidationResult> {
  const lowerHost = hostname.toLowerCase().trim();
  const now = Date.now();
  const cached = dnsSafetyCache.get(lowerHost);
  if (cached && cached.expiry > now) {
    return cached.result;
  }

  const result = await validateHostSafetyInternal(lowerHost);
  if (result.isValid) {
    dnsSafetyCache.set(lowerHost, { result, expiry: now + 60000 });
  }
  return result;
}

async function validateHostSafetyInternal(lowerHost: string): Promise<IpValidationResult> {
  // Disallow explicit localhost or metadata names immediately
  if (
    lowerHost === 'localhost' ||
    lowerHost.endsWith('.localhost') ||
    lowerHost.endsWith('.local') ||
    lowerHost.endsWith('.internal') ||
    lowerHost.endsWith('.lan') ||
    lowerHost.includes('169.254.169.254') ||
    lowerHost.includes('metadata.google')
  ) {
    return {
      isValid: false,
      reason: `Hostname '${lowerHost}' is a reserved internal or loopback address.`,
    };
  }

  // Check if hostname is directly an IP literal
  if (ipaddr.isValid(lowerHost)) {
    if (isPrivateOrReservedIp(lowerHost)) {
      return {
        isValid: false,
        ip: lowerHost,
        reason: `IP '${lowerHost}' is in a private, loopback, or reserved range.`,
      };
    }
    return { isValid: true, ip: lowerHost };
  }

  // Perform DNS resolution for both A (IPv4) and AAAA (IPv6)
  try {
    let resolvedIps: string[] = [];

    const [ipv4Addresses, ipv6Addresses] = await Promise.allSettled([
      dns.resolve4(lowerHost),
      dns.resolve6(lowerHost),
    ]);

    if (ipv4Addresses.status === 'fulfilled') {
      resolvedIps.push(...ipv4Addresses.value);
    }
    if (ipv6Addresses.status === 'fulfilled') {
      resolvedIps.push(...ipv6Addresses.value);
    }

    // Fallback to dns.lookup if direct resolver returns empty (common on local dev / VPNs)
    if (resolvedIps.length === 0) {
      try {
        const lookupResult = await dns.lookup(lowerHost, { all: true });
        resolvedIps = lookupResult.map((r) => r.address);
      } catch {
        // ignore fallback failure
      }
    }

    if (resolvedIps.length === 0) {
      return {
        isValid: false,
        reason: `Could not resolve DNS records for '${lowerHost}'.`,
      };
    }

    // Every single resolved IP address must be public and non-reserved
    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIp(ip)) {
        return {
          isValid: false,
          ip,
          reason: `Resolved IP '${ip}' for host '${lowerHost}' is in a private/restricted address range.`,
        };
      }
    }

    return {
      isValid: true,
      ip: resolvedIps[0],
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      reason: `DNS lookup failed for '${lowerHost}': ${errorMsg}`,
    };
  }
}

/**
 * Checks whether targetHostname belongs to the same site as baseHostname,
 * explicitly supporting apex <-> www equivalence and optional subdomains.
 */
export function isSameDomainOrSubdomain(
  targetHostname: string,
  baseHostname: string,
  allowSubdomains: boolean = false
): boolean {
  const target = targetHostname.toLowerCase().trim();
  const base = baseHostname.toLowerCase().trim();

  if (target === base) return true;

  // Apex <-> WWW equivalence
  if (base.startsWith('www.') && target === base.substring(4)) return true;
  if (target.startsWith('www.') && target.substring(4) === base) return true;

  // Subdomain matching
  if (allowSubdomains && target.endsWith(`.${base}`)) return true;

  return false;
}

/**
 * Validates a target URL for crawling:
 * - Scheme must be http or https
 * - Port must be standard (80, 443, 8080, 8443) or omitted
 * - Host must resolve to public IPs only
 */
export async function validateTargetUrl(rawUrl: string): Promise<{
  isValid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  resolvedIp?: string;
  error?: string;
}> {
  let parsed: URL;
  try {
    let toParse = rawUrl.trim();
    if (!toParse.includes('://')) {
      toParse = `https://${toParse}`;
    }
    parsed = new URL(toParse);
  } catch {
    return { isValid: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed.' };
  }

  // Restrict to standard web ports
  if (parsed.port && !ALLOWED_PORTS.has(parsed.port)) {
    return {
      isValid: false,
      error: `Port '${parsed.port}' is not permitted. Only standard web ports (80, 443, 8080, 8443) are supported.`,
    };
  }

  // Validate Host
  const safety = await validateHostSafety(parsed.hostname);
  if (!safety.isValid) {
    return { isValid: false, error: safety.reason };
  }

  return {
    isValid: true,
    normalizedUrl: parsed.origin + parsed.pathname + parsed.search,
    hostname: parsed.hostname,
    resolvedIp: safety.ip,
  };
}
