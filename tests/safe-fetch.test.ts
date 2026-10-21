import { describe, it, expect } from 'vitest';
import { safeFetch } from '../src/lib/security/safe-fetch';

describe('Safe Fetch Pipeline with undici', () => {
  it('successfully fetches https://example.com with 200 OK', async () => {
    const res = await safeFetch('https://example.com');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Example Domain');
    expect(res.durationMs).toBeGreaterThan(0);
  });

  it('correctly follows apex -> www redirects for https://kingshyer.com with allowedHostname', async () => {
    const res = await safeFetch('https://kingshyer.com', {
      allowedHostname: 'kingshyer.com',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(1000);
    expect(res.redirectChain.length).toBeGreaterThan(0);
    expect(res.url).toContain('kingshyer.com');
  }, 15000);

  it('blocks private IP fetches via SSRF', async () => {
    await expect(safeFetch('http://127.0.0.1')).rejects.toThrow();
  });
});
