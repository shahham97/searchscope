import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeStructuredData(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];
  const homePage = pages[0];

  let totalSchemasFound = 0;
  let homePageHasOrganizationOrWebsite = false;

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    const pageSchemas = page.structuredData;
    totalSchemasFound += pageSchemas.length;

    for (const schema of pageSchemas) {
      // 1. JSON Syntax errors
      if (!schema.isValid) {
        findings.push({
          id: `SCHEMA-SYNTAX-ERROR-${page.normalizedUrl}`,
          category: 'structured_data',
          severity: 'critical',
          title: `Malformed JSON-LD Syntax`,
          evidence: `Failed to parse JSON-LD script on ${page.url}: ${schema.errors.join('; ')}`,
          affectedUrl: page.url,
          whyItMatters:
            'Syntax errors in JSON-LD prevent search engine parsers from reading any of the structured data entities in that block.',
          confidence: 'high',
          recommendedFix: 'Fix JSON syntax (unescaped quotes, trailing commas, or missing brackets).',
          effort: 'quick_win',
          validationInstructions: 'Validate the JSON script using Schema.org validator or Google Rich Results Test.',
        });
      }

      // Check required schema.org properties
      if (schema.warnings.length > 0) {
        findings.push({
          id: `SCHEMA-WARNING-${page.normalizedUrl}-${schema.type}`,
          category: 'structured_data',
          severity: 'low',
          title: `Missing recommended schema property in ${schema.type}`,
          evidence: schema.warnings.join('; '),
          affectedUrl: page.url,
          whyItMatters:
            'Structured data schemas missing standard attributes (like @context) may be ignored by search engine entity extractors.',
          confidence: 'high',
          recommendedFix: 'Ensure every JSON-LD object explicitly declares "@context": "https://schema.org".',
          effort: 'quick_win',
          validationInstructions: 'Re-check schema block in validator.',
        });
      }

      // Check for homepage Organization / WebSite entity
      if (page === homePage) {
        const typeLower = schema.type.toLowerCase();
        if (typeLower.includes('organization') || typeLower.includes('website') || typeLower.includes('localbusiness')) {
          homePageHasOrganizationOrWebsite = true;
        }
      }
    }
  }

  // 2. Organization / WebSite schema on homepage
  if (homePage && homePage.isHtml && homePage.statusCode === 200 && !homePageHasOrganizationOrWebsite) {
    findings.push({
      id: 'SCHEMA-ORG-MISSING',
      category: 'structured_data',
      severity: 'high',
      title: 'Missing Organization or WebSite schema on homepage',
      evidence: 'No Organization, WebSite, or LocalBusiness Schema.org JSON-LD found on the homepage.',
      affectedUrl: homePage.url,
      whyItMatters:
        'Organization schema establishes your brand entity in Google Knowledge Graph, links official social profiles, and disambiguates your business for AEO/GEO answer engines.',
      confidence: 'high',
      recommendedFix: 'Add a JSON-LD Organization schema block to your homepage <head>.',
      implementationExample: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${homePage.title || 'Your Brand'}",\n  "url": "${homePage.url}",\n  "logo": "${homePage.url}/logo.png",\n  "sameAs": [\n    "https://twitter.com/yourbrand",\n    "https://linkedin.com/company/yourbrand"\n  ]\n}\n</script>`,
      effort: 'quick_win',
      validationInstructions: 'Test homepage URL in Google Rich Results Test to confirm Organization entity detection.',
    });
  }

  // 3. Overall Structured Data presence
  if (totalSchemasFound === 0 && pages.length > 0) {
    findings.push({
      id: 'SCHEMA-TOTAL-ABSENT',
      category: 'structured_data',
      severity: 'medium',
      title: 'No Structured Data (JSON-LD) detected across audited pages',
      evidence: `Crawl inspected ${pages.length} pages and detected 0 Schema.org JSON-LD blocks.`,
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'Structured data is fundamental for modern search features, enhanced SERP appearance, and machine understanding by generative engines (GEO).',
      confidence: 'high',
      recommendedFix: 'Implement Schema.org JSON-LD (e.g. BreadcrumbList, WebPage, Article, Organization) across all key templates.',
      effort: 'moderate',
      validationInstructions: 'Implement initial JSON-LD and verify with Schema Markup Validator.',
    });
  }

  return findings;
}
