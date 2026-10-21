import { describe, it, expect } from 'vitest';
import { parseSitemapXml } from '../src/lib/crawler/sitemap';

describe('XML Sitemap Parser', () => {
  it('parses standard <urlset> sitemaps', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
  </url>
</urlset>`;

    const result = parseSitemapXml(xml);
    expect(result.urls).toHaveLength(2);
    expect(result.urls).toContain('https://example.com/');
    expect(result.urls).toContain('https://example.com/about');
    expect(result.nestedSitemaps).toHaveLength(0);
  });

  it('parses <sitemapindex> recursive index sitemaps', () => {
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
  </sitemap>
</sitemapindex>`;

    const result = parseSitemapXml(indexXml);
    expect(result.urls).toHaveLength(0);
    expect(result.nestedSitemaps).toHaveLength(2);
    expect(result.nestedSitemaps).toContain('https://example.com/sitemap-posts.xml');
  });

  it('gracefully handles malformed or non-XML text without throwing', () => {
    const malformed = '<html><body>Not a sitemap</body></html>';
    const result = parseSitemapXml(malformed);
    expect(result.urls).toHaveLength(0);
    expect(result.nestedSitemaps).toHaveLength(0);
  });
});
