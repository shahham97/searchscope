import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeSocialMetadata(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    let path = '';
    try {
      const toParse = /^https?:\/\//i.test(page.url) ? page.url : `https://${page.url}`;
      path = new URL(toParse).pathname.toLowerCase();
    } catch {
      path = (page.url || '').toLowerCase();
    }
    const isProductPage = path.includes('/product/');
    const isBlogPage = path.includes('/blog/') || path.includes('/article/') || path.includes('/news/');

    // 1. OG Type Mismatch
    if (page.ogType) {
      const typeLower = page.ogType.toLowerCase();
      if (isProductPage && (typeLower === 'article' || typeLower === 'website')) {
        findings.push({
          id: `SOCIAL-OG-TYPE-MISMATCH-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'medium',
          title: `Open Graph type mismatch on product page (uses "${page.ogType}")`,
          evidence: `Product page at ${page.url} declares og:type="${page.ogType}". E-commerce product pages should use standard og:type="product" or "og:product".`,
          affectedUrl: page.url,
          whyItMatters:
            'Social networks and messaging platforms customize link preview card layouts based on og:type. Marking products as "article" or generic "website" prevents rich product pricing and stock cards.',
          confidence: 'high',
          recommendedFix: 'Update the Open Graph type to "product" in page metadata.',
          implementationExample: `<meta property="og:type" content="product" />`,
          effort: 'quick_win',
          validationInstructions: 'Verify <meta property="og:type" content="product"> in HTML source.',
        });
      }

      if (isBlogPage && typeLower !== 'article') {
        findings.push({
          id: `SOCIAL-OG-TYPE-BLOG-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'low',
          title: `Blog article missing og:type="article" (uses "${page.ogType}")`,
          evidence: `Article at ${page.url} declares og:type="${page.ogType}" instead of "article".`,
          affectedUrl: page.url,
          whyItMatters:
            'Article previews display author names and published dates when og:type="article" is declared.',
          confidence: 'high',
          recommendedFix: 'Set og:type to "article" on blog and article pages.',
          effort: 'quick_win',
          validationInstructions: 'Inspect og:type on blog articles.',
        });
      }
    }

    // 2. OG Image Recommended Dimensions & Alt
    if (page.ogImage) {
      const width = page.ogImageWidth ? parseInt(page.ogImageWidth, 10) : undefined;
      const height = page.ogImageHeight ? parseInt(page.ogImageHeight, 10) : undefined;

      if (!width || !height) {
        findings.push({
          id: `SOCIAL-OG-IMAGE-DIMENSIONS-MISSING-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'low',
          title: 'Open Graph image missing explicit dimensions (og:image:width / height)',
          evidence: `Page declares og:image="${page.ogImage}", but omits og:image:width and og:image:height tags.`,
          affectedUrl: page.url,
          whyItMatters:
            'Without explicit width and height metadata, social platforms (Facebook, LinkedIn, iMessage) must download and inspect the image before rendering, causing preview delay or fallback to generic thumbnails.',
          confidence: 'high',
          recommendedFix: 'Add explicit 1200x630 dimension tags for fast synchronous card rendering.',
          implementationExample: `<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />`,
          effort: 'quick_win',
          validationInstructions: 'Check for og:image:width and og:image:height meta tags.',
        });
      } else if (width < 600 || height < 315) {
        findings.push({
          id: `SOCIAL-OG-IMAGE-TOO-SMALL-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'medium',
          title: `Open Graph image is smaller than recommended (${width}x${height}px)`,
          evidence: `Current og:image dimensions are ${width}x${height}px. Social platforms recommend at least 1200x630px (minimum 600x315px) for high-resolution large cards.`,
          affectedUrl: page.url,
          whyItMatters:
            'Images under 600x315px are displayed as tiny square thumbnails beside text rather than prominent large visual preview cards.',
          confidence: 'high',
          recommendedFix: 'Supply a 1200x630px landscape image for social share cards.',
          effort: 'quick_win',
          validationInstructions: 'Ensure og:image source image is at least 1200px wide.',
        });
      }

      if (!page.ogImageAlt) {
        findings.push({
          id: `SOCIAL-OG-IMAGE-ALT-MISSING-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'low',
          title: 'Missing accessibility description for social image (og:image:alt)',
          evidence: 'Page declares an og:image but lacks an og:image:alt meta tag.',
          affectedUrl: page.url,
          whyItMatters:
            'og:image:alt provides screen reader descriptions when cards are shared on social platforms like Twitter/X and Facebook.',
          confidence: 'high',
          recommendedFix: 'Add an og:image:alt tag describing the social image.',
          implementationExample: `<meta property="og:image:alt" content="${page.title || 'Brand showcase'}" />`,
          effort: 'quick_win',
          validationInstructions: 'Verify og:image:alt is present in HTML head.',
        });
      }
    }
  }

  return findings;
}
