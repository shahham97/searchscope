import { describe, it, expect } from 'vitest';
import { normalizeUrl, isInternalUrl, extractHostname } from '../src/lib/crawler/url-utils';

describe('URL Normalization & Utilities', () => {
  it('normalizes URLs removing tracking query parameters and hash fragments', () => {
    const raw = 'https://example.com/blog/article/?utm_source=twitter&utm_medium=social#comments';
    const normalized = normalizeUrl(raw);
    expect(normalized).toBe('https://example.com/blog/article');
  });

  it('normalizes trailing slashes except for root path', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    expect(normalizeUrl('https://example.com/about/')).toBe('https://example.com/about');
  });

  it('resolves relative URLs against base origin', () => {
    const base = 'https://example.com/sub/dir';
    expect(normalizeUrl('/contact', base)).toBe('https://example.com/contact');
    expect(normalizeUrl('team', base)).toBe('https://example.com/sub/team');
  });

  it('rejects mailto, javascript, and tel pseudo-protocols', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('mailto:admin@example.com')).toBeNull();
    expect(normalizeUrl('tel:+1234567890')).toBeNull();
  });

  it('correctly identifies internal vs external URLs', () => {
    expect(isInternalUrl('https://example.com/page', 'example.com')).toBe(true);
    expect(isInternalUrl('https://www.example.com/page', 'example.com')).toBe(true);
    expect(isInternalUrl('https://example.com/page', 'www.example.com')).toBe(true);
    expect(isInternalUrl('https://sub.example.com/page', 'example.com', true)).toBe(true);
    expect(isInternalUrl('https://sub.example.com/page', 'example.com', false)).toBe(false);
    expect(isInternalUrl('https://otherdomain.com/page', 'example.com')).toBe(false);
  });

  it('extracts hostname from arbitrary inputs', () => {
    expect(extractHostname('example.com')).toBe('example.com');
    expect(extractHostname('https://sub.domain.org/path')).toBe('sub.domain.org');
  });
});
