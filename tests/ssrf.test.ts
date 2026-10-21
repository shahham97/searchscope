import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIp, validateHostSafety, validateTargetUrl } from '../src/lib/security/ssrf';

describe('SSRF & IP Safety Protection', () => {
  it('blocks IPv4 loopback (127.0.0.1, 127.0.0.2)', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('127.10.20.30')).toBe(true);
  });

  it('blocks private IPv4 RFC1918 ranges (10.x, 172.16.x, 192.168.x)', () => {
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('10.254.254.254')).toBe(true);
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.100.50')).toBe(true);
  });

  it('blocks Cloud Metadata IPs (169.254.169.254 and link-local)', () => {
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);
  });

  it('blocks IPv6 loopback and unspecified (::1, ::)', () => {
    expect(isPrivateOrReservedIp('::1')).toBe(true);
    expect(isPrivateOrReservedIp('::')).toBe(true);
  });

  it('blocks IPv6 mapped IPv4 loopback (::ffff:127.0.0.1)', () => {
    expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:10.0.0.1')).toBe(true);
  });

  it('allows safe public IPv4 and IPv6 addresses', () => {
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
    expect(isPrivateOrReservedIp('93.184.216.34')).toBe(false); // example.com
    expect(isPrivateOrReservedIp('2606:4700:4700::1111')).toBe(false); // Cloudflare DNS
  });

  it('blocks localhost and internal hostnames directly', async () => {
    const res1 = await validateHostSafety('localhost');
    expect(res1.isValid).toBe(false);

    const res2 = await validateHostSafety('service.local');
    expect(res2.isValid).toBe(false);

    const res3 = await validateHostSafety('db.internal');
    expect(res3.isValid).toBe(false);
  });

  it('validates target URLs rejecting non-standard ports and protocols', async () => {
    const res1 = await validateTargetUrl('ftp://example.com');
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('Only HTTP and HTTPS');

    const res2 = await validateTargetUrl('http://example.com:9000');
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain('Only standard web ports');

    const res3 = await validateTargetUrl('http://127.0.0.1');
    expect(res3.isValid).toBe(false);
  });
});
