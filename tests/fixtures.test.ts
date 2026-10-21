import { describe, it, expect } from 'vitest';
import { parseHtmlContent } from '../src/lib/extractor/html-parser';
import { isLikelySpaShell } from '../src/lib/extractor/headless-renderer';
import { categorizeError } from '../src/lib/security/safe-fetch';
import { analyzeStructuredData } from '../src/lib/analyzer/structured-data';

describe('Local Fixtures: Deterministic Testing', () => {
  it('detects a JS SPA shell from fixture HTML', () => {
    const spaHtml = `<!DOCTYPE html>
<html>
<head><title>App</title><script src="/bundle.js"></script></head>
<body><div id="root"></div></body>
</html>`;
    expect(isLikelySpaShell(spaHtml, 10)).toBe(true);
    expect(isLikelySpaShell(spaHtml, 500)).toBe(false);
  });

  it('identifies WAF challenge from response fixture', () => {
    const wafBody = `<!DOCTYPE html>
<html>
<head><title>Just a moment...</title></head>
<body><div class="cf-browser-verification">Verifying your browser...</div></body>
</html>`;
    const result = categorizeError(null, 403, wafBody);
    expect(result.code).toBe('WAF_CHALLENGE');
    expect(result.hint).toContain('Cloudflare/Vercel Attack Challenge');
  });

  it('identifies redirect loops and too many redirects', () => {
    const loopError = new Error('Too many redirects (exceeded limit of 10)');
    const result = categorizeError(loopError);
    expect(result.code).toBe('REDIRECT_LOOP');
  });

  it('detects broken schema syntax from fixture HTML', () => {
    const brokenSchemaHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Broken Schema Page</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Luxury Perfume"
    // Missing comma and closing quote error:
  </script>
</head>
<body><h1>Broken Schema</h1><p>Test content.</p></body>
</html>`;

    const pageData = parseHtmlContent('https://example.com/broken', brokenSchemaHtml);
    expect(pageData.structuredData.length).toBe(1);
    expect(pageData.structuredData[0].isValid).toBe(false);

    const findings = analyzeStructuredData([pageData]);
    expect(findings.some((f) => f.id.includes('SCHEMA-SYNTAX-ERROR'))).toBe(true);
  });
});
