import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

export interface IpValidationResult {
  isValid: boolean;
  ip?: string;
  reason?: string;
}

/**
 * Checks whether an IP address belongs to private, loopback, link-local,
 * multicast, carrier-grade NAT, or cloud metadata ranges.
 */
export function isPrivateOrReservedIp(ipString: string): boolean {
  try {
    const addr = ipaddr.parse(ipString);
    const range = addr.range();

    // Standard ranges considered private/reserved in ipaddr.js:
    // 'loopback', 'private', 'linkLocal', 'carrierGradeNat', 'uniqueLocal',
    // 'broadcast', 'multicast', 'reserved', 'unspecified'
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

    // Explicit check for AWS/GCP/Azure link-local metadata (169.254.169.254 and 169.254.0.0/16)
    if (addr.kind() === 'ipv4') {
      const octets = (addr as ipaddr.IPv4).octets;
      if (octets[0] === 169 && octets[1] === 254) {
        return true;
      }
      // 0.0.0.0/8 current network
      if (octets[0] === 0) {
        return true;
      }
      // 127.0.0.0/8 loopback
      if (octets[0] === 127) {
        return true;
      }
      // 10.0.0.0/8 private
      if (octets[0] === 10) {
        return true;
      }
      // 172.16.0.0/12 private
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
        return true;
      }
      // 192.168.0.0/16 private
      if (octets[0] === 192 && octets[1] === 168) {
        return true;
      }
      // 100.64.0.0/10 Carrier-grade NAT
      if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
        return true;
      }
    } else if (addr.kind() === 'ipv6') {
      // Check IPv6 mapped IPv4 addresses (::ffff:127.0.0.1, etc.)
      const ipv6 = addr as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
        const mappedV4 = ipv6.toIPv4Address();
        return isPrivateOrReservedIp(mappedV4.toString());
      }
      // ::1 loopback
      if (ipv6.toString() === '::1' || ipv6.toString() === '::') {
        return true;
      }
    }

    return false;
  } catch {
    // If not a parseable IP address, treat as invalid/blocked for safety
    return true;
  }
}

/**
 * Validates a hostname and ensures all its resolved IPv4 and IPv6 addresses
 * are safe and non-private.
 */
export async function validateHostSafety(hostname: string): Promise<IpValidationResult> {
  // Disallow explicit localhost or metadata names immediately
  const lowerHost = hostname.toLowerCase().trim();
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
      reason: `Hostname '${hostname}' is a reserved internal or loopback address.`,
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
    const [ipv4Addresses, ipv6Addresses] = await Promise.allSettled([
      dns.resolve4(lowerHost),
      dns.resolve6(lowerHost),
    ]);

    const resolvedIps: string[] = [];

    if (ipv4Addresses.status === 'fulfilled') {
      resolvedIps.push(...ipv4Addresses.value);
    }
    if (ipv6Addresses.status === 'fulfilled') {
      resolvedIps.push(...ipv6Addresses.value);
    }

    if (resolvedIps.length === 0) {
      return {
        isValid: false,
        reason: `Could not resolve DNS records for '${hostname}'.`,
      };
    }

    // Every single resolved IP address must be public and non-reserved
    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIp(ip)) {
        return {
          isValid: false,
          ip,
          reason: `Resolved IP '${ip}' for host '${hostname}' is in a private/restricted address range.`,
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
      reason: `DNS lookup failed for '${hostname}': ${errorMsg}`,
    };
  }
}

/**
 * Validates a target URL for crawling:
 * - Scheme must be http or https
 * - Port must be default (80, 443) or omitted
 * - Host must be valid and resolve to public IPs only
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
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { isValid: false, error: `Port '${parsed.port}' is not permitted. Only standard web ports (80/443) are supported.` };
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
