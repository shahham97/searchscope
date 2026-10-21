import { describe, it, expect } from 'vitest';
import { parseHtmlContent, calculateFleschKincaid } from '../src/lib/extractor/html-parser';

describe('HTML Content Extractor & Metadata Parser', () => {
  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SearchScope - Enterprise Search Intelligence & Audit Platform</title>
  <meta name="description" content="Production-grade website auditing application for technical SEO, structured data, AEO and GEO intelligence.">
  <link rel="canonical" href="https://example.com/platform">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="SearchScope Platform">
  <meta property="og:image" content="https://example.com/card.png">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SearchScope Inc",
    "url": "https://example.com"
  }
  </script>
</head>
<body>
  <h1>SearchScope Platform Overview</h1>
  <p>SearchScope is defined as a comprehensive website search audit system. It evaluates crawlability, metadata, and Generative Engine Optimization.</p>
  <h2>Core Capabilities</h2>
  <p>Here are the key capabilities for engineering teams.</p>
  <ul>
    <li>Technical SEO Engine</li>
    <li>AEO and GEO analysis</li>
  </ul>
  <img src="/logo.png" alt="SearchScope Logo" width="200" height="50" loading="lazy">
  <img src="/banner.png">
  <a href="/pricing">View Pricing</a>
  <a href="https://github.com/searchscope">External GitHub</a>
</body>
</html>`;

  it('extracts metadata accurately', () => {
    const data = parseHtmlContent('https://example.com/platform', sampleHtml);

    expect(data.title).toBe('SearchScope - Enterprise Search Intelligence & Audit Platform');
    expect(data.metaDescription).toBe('Production-grade website auditing application for technical SEO, structured data, AEO and GEO intelligence.');
    expect(data.canonicalUrl).toBe('https://example.com/platform');
    expect(data.lang).toBe('en');
    expect(data.viewport).toContain('width=device-width');
    expect(data.ogTitle).toBe('SearchScope Platform');
  });

  it('analyzes heading hierarchy and issues', () => {
    const data = parseHtmlContent('https://example.com/platform', sampleHtml);
    expect(data.h1s).toHaveLength(1);
    expect(data.h1s[0]).toBe('SearchScope Platform Overview');
    expect(data.h2s).toHaveLength(1);
    expect(data.headingHierarchyValid).toBe(true);
  });

  it('classifies internal vs external links', () => {
    const data = parseHtmlContent('https://example.com/platform', sampleHtml);
    expect(data.internalLinks.some((l) => l.url.includes('/pricing'))).toBe(true);
    expect(data.externalLinks.some((l) => l.url.includes('github.com'))).toBe(true);
  });

  it('detects images with and without alt text', () => {
    const data = parseHtmlContent('https://example.com/platform', sampleHtml);
    expect(data.images).toHaveLength(2);
    expect(data.images[0].hasAlt).toBe(true);
    expect(data.images[0].isLazy).toBe(true);
    expect(data.images[0].hasExplicitDimensions).toBe(true);
    expect(data.images[1].hasAlt).toBe(false);
  });

  it('correctly extracts H1 inside <header> within product layout (no false positive missing H1)', () => {
    const productHtml = `
      <html>
        <head><title>Velvet Amber Oud</title></head>
        <body>
          <main>
            <article>
              <header class="product-header">
                <h1 class="font-display text-4xl">Velvet Amber</h1>
                <p class="tagline">Artisanal perfume oil</p>
              </header>
              <div class="content"><p>Rich amber and oud notes.</p></div>
            </article>
          </main>
        </body>
      </html>
    `;
    const data = parseHtmlContent('https://example.com/product/velvet-amber', productHtml);
    expect(data.h1s).toEqual(['Velvet Amber']);
    expect(data.headingIssues).not.toContain('Missing H1 heading tag.');
  });

  it('detects rotating slide/carousel H1 on homepage', () => {
    const carouselHtml = `
      <html>
        <head><title>Brand Home</title></head>
        <body>
          <section class="hero-swiper swiper-container">
            <div class="swiper-slide" role="group" aria-roledescription="slide">
              <h1 class="slide-title">The Art of Desert Sovereign.</h1>
            </div>
          </section>
        </body>
      </html>
    `;
    const data = parseHtmlContent('https://example.com/', carouselHtml);
    expect(data.h1s).toEqual(['The Art of Desert Sovereign.']);
    expect(data.isH1InCarousel).toBe(true);
  });

  it('detects empty and visually hidden H1 elements', () => {
    const hiddenHtml = `
      <html>
        <head><title>Hidden Test</title></head>
        <body>
          <h1 style="display:none">Hidden SEO Title</h1>
        </body>
      </html>
    `;
    const hiddenData = parseHtmlContent('https://example.com/hidden', hiddenHtml);
    expect(hiddenData.isH1Hidden).toBe(true);

    const emptyHtml = `
      <html>
        <head><title>Empty Test</title></head>
        <body>
          <h1>   </h1>
        </body>
      </html>
    `;
    const emptyData = parseHtmlContent('https://example.com/empty', emptyHtml);
    expect(emptyData.h1s).toHaveLength(0);
    expect(emptyData.emptyH1Count).toBe(1);
  });

  it('parses and validates JSON-LD structured data', () => {
    const data = parseHtmlContent('https://example.com/platform', sampleHtml);
    expect(data.structuredData).toHaveLength(1);
    expect(data.structuredData[0].type).toBe('Organization');
    expect(data.structuredData[0].isValid).toBe(true);
  });

  it('detects direct definitions and structured lists', () => {
    const data = parseHtmlContent('https://example.com/platform', sampleHtml);
    expect(data.hasDirectDefinitions).toBe(true);
    expect(data.hasTablesOrLists).toBe(true);
  });

  it('computes Flesch-Kincaid Reading Ease score', () => {
    const score = calculateFleschKincaid('This is a simple sentence. We test readability easily.');
    expect(score).toBeGreaterThan(50);
  });
});
