import { describe, it, expect } from 'vitest';
import { parseRobotsTxt, isPathAllowed } from '../src/lib/crawler/robots';

describe('Robots.txt Parser & Compliance', () => {
  const sampleRobots = `
# Sample robots.txt
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /private/public-doc
Crawl-delay: 2

User-agent: BadBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-news.xml
`;

  it('parses sitemaps declared in robots.txt', () => {
    const parsed = parseRobotsTxt(sampleRobots);
    expect(parsed.sitemaps).toHaveLength(2);
    expect(parsed.sitemaps).toContain('https://example.com/sitemap.xml');
    expect(parsed.sitemaps).toContain('https://example.com/sitemap-news.xml');
  });

  it('respects Disallow directives for general crawlers', () => {
    const parsed = parseRobotsTxt(sampleRobots);
    expect(isPathAllowed('/about', parsed)).toBe(true);
    expect(isPathAllowed('/admin/dashboard', parsed)).toBe(false);
  });

  it('allows paths where Allow directive matches with equal or higher specificity', () => {
    const parsed = parseRobotsTxt(sampleRobots);
    expect(isPathAllowed('/private/secret', parsed)).toBe(false);
    expect(isPathAllowed('/private/public-doc', parsed)).toBe(true);
  });

  it('allows all paths if robots.txt is absent', () => {
    const emptyRobots = { present: false, content: '', sitemaps: [], rules: [] };
    expect(isPathAllowed('/admin', emptyRobots)).toBe(true);
  });
});
