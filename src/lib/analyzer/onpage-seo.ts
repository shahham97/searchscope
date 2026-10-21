import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeOnPageSeo(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  // Track duplicates across site
  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    if (page.title) {
      const existing = titleMap.get(page.title) || [];
      existing.push(page.url);
      titleMap.set(page.title, existing);
    }

    if (page.metaDescription) {
      const existing = descMap.get(page.metaDescription) || [];
      existing.push(page.url);
      descMap.set(page.metaDescription, existing);
    }

    // 1. Title Checks
    if (!page.title) {
      findings.push({
        id: `ONPAGE-TITLE-MISSING-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'critical',
        title: 'Missing <title> tag',
        evidence: 'No <title> tag found in HTML <head>.',
        affectedUrl: page.url,
        whyItMatters:
          'The title tag is one of the most critical on-page SEO signals, determining the clickable headline shown in SERPs and browser tabs.',
        confidence: 'high',
        recommendedFix: 'Add a descriptive, keyword-rich <title> tag between 50-60 characters summarizing the page topic.',
        implementationExample: `<title>Primary Keyword - Specific Topic | Brand Name</title>`,
        effort: 'quick_win',
        validationInstructions: 'Inspect page source and verify <title> is populated.',
      });
    } else if (page.titleLength < 25) {
      findings.push({
        id: `ONPAGE-TITLE-SHORT-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'low',
        title: `Title tag is unusually short (${page.titleLength} characters)`,
        evidence: `Current title: "${page.title}" (${page.titleLength} chars). Recommended range: 50–60 characters.`,
        affectedUrl: page.url,
        whyItMatters:
          'Short titles miss opportunities to include secondary keywords, brand context, and value propositions that boost click-through rates.',
        confidence: 'high',
        recommendedFix: `Expand title to include relevant secondary terms and brand name. Example: "${page.title} — Comprehensive Guide & Solutions | Brand"`,
        effort: 'quick_win',
        validationInstructions: 'Check that new title length is between 40 and 60 characters.',
      });
    } else if (page.titleLength > 65) {
      findings.push({
        id: `ONPAGE-TITLE-LONG-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'medium',
        title: `Title tag exceeds recommended length (${page.titleLength} characters)`,
        evidence: `Current title: "${page.title.slice(0, 70)}..." (${page.titleLength} chars). Recommended maximum: ~60 characters (~600px).`,
        affectedUrl: page.url,
        whyItMatters:
          'Search engines truncate titles longer than ~600px (roughly 60 characters) with ellipses, cutting off critical branding or calls to action.',
        confidence: 'high',
        recommendedFix: 'Shorten the title so key keywords and brand appear within the first 60 characters.',
        effort: 'quick_win',
        validationInstructions: 'Verify title does not exceed 60 characters.',
      });
    }

    // 2. Meta Description Checks
    if (!page.metaDescription) {
      findings.push({
        id: `ONPAGE-DESC-MISSING-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'high',
        title: 'Missing meta description tag',
        evidence: 'No <meta name="description"> tag declared in HTML <head>.',
        affectedUrl: page.url,
        whyItMatters:
          'Without a custom meta description, search engines auto-generate snippet text from random page content, often lowering click-through rates.',
        confidence: 'high',
        recommendedFix: 'Add a compelling meta description between 120 and 155 characters that summarizes page benefits and includes a clear call to action.',
        implementationExample: `<meta name="description" content="Discover actionable insights and comprehensive solutions for ${page.title || 'your topic'}. Learn how to optimize results today." />`,
        effort: 'quick_win',
        validationInstructions: 'Verify meta description tag is present in HTML head.',
      });
    } else if (page.metaDescriptionLength < 70) {
      findings.push({
        id: `ONPAGE-DESC-SHORT-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'low',
        title: `Meta description is too short (${page.metaDescriptionLength} characters)`,
        evidence: `Current description: "${page.metaDescription}" (${page.metaDescriptionLength} chars). Recommended: 120–155 characters.`,
        affectedUrl: page.url,
        whyItMatters:
          'Short snippets give search engines less context and fail to compel users in search engine result pages.',
        confidence: 'medium',
        recommendedFix: 'Expand description to 120–155 characters highlighting key offerings and a call to action.',
        effort: 'quick_win',
        validationInstructions: 'Check description length in character counter.',
      });
    } else if (page.metaDescriptionLength > 165) {
      findings.push({
        id: `ONPAGE-DESC-LONG-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'low',
        title: `Meta description is overly long (${page.metaDescriptionLength} characters)`,
        evidence: `Length is ${page.metaDescriptionLength} characters. Google typically truncates snippets at ~155–160 characters.`,
        affectedUrl: page.url,
        whyItMatters:
          'Truncated descriptions end abruptly in SERPs, potentially cutting off vital information or phone numbers.',
        confidence: 'medium',
        recommendedFix: 'Trim description to under 160 characters while keeping the primary value proposition upfront.',
        effort: 'quick_win',
        validationInstructions: 'Ensure description is under 160 characters.',
      });
    }

    // 3. Headings checks
    if (page.h1s.length === 0) {
      findings.push({
        id: `ONPAGE-H1-MISSING-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'high',
        title: 'Missing primary <h1> heading',
        evidence: 'Document contains zero <h1> elements.',
        affectedUrl: page.url,
        whyItMatters:
          'The H1 tag communicates the page primary subject to search engines and screen readers, establishing content hierarchy.',
        confidence: 'high',
        recommendedFix: 'Add a single descriptive <h1> element at the top of the main content area.',
        implementationExample: `<h1>${page.title || 'Primary Page Topic'}</h1>`,
        effort: 'quick_win',
        validationInstructions: 'Confirm an <h1> element exists in the rendered DOM.',
      });
    } else if (page.h1s.length > 1) {
      findings.push({
        id: `ONPAGE-H1-MULTIPLE-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'medium',
        title: `Multiple <h1> headings found (${page.h1s.length} detected)`,
        evidence: `H1 headings found: ${page.h1s.map((h) => `"${h}"`).join(', ')}`,
        affectedUrl: page.url,
        whyItMatters:
          'While HTML5 permits multiple H1s, SEO best practice recommends a single authoritative H1 representing the main topic, with subtopics organized under H2s and H3s.',
        confidence: 'medium',
        recommendedFix: 'Reserve <h1> for the page title and convert secondary headings to <h2> tags.',
        effort: 'quick_win',
        validationInstructions: 'Inspect heading structure and confirm exactly one <h1> is rendered.',
      });
    }

    if (!page.headingHierarchyValid && page.headingIssues.length > 0) {
      findings.push({
        id: `ONPAGE-HEADING-HIERARCHY-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'low',
        title: 'Skipped heading levels detected',
        evidence: page.headingIssues.join('; '),
        affectedUrl: page.url,
        whyItMatters:
          'Logical heading structure (H1 -> H2 -> H3) aids assistive technologies and enables search engine semantic parsers to correctly model content architecture.',
        confidence: 'high',
        recommendedFix: 'Ensure headings do not skip levels (e.g. do not jump from H1 directly to H3 without an intervening H2).',
        effort: 'quick_win',
        validationInstructions: 'Verify heading levels follow a hierarchical sequence.',
      });
    }

    // 4. Image Alt text
    const missingAltImages = page.images.filter((img) => !img.hasAlt);
    if (missingAltImages.length > 0) {
      findings.push({
        id: `ONPAGE-IMAGE-ALT-MISSING-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'medium',
        title: `Images missing alt attribute (${missingAltImages.length} images affected)`,
        evidence: `Images lacking descriptive alt text: ${missingAltImages.slice(0, 3).map((i) => i.src).join(', ')}${missingAltImages.length > 3 ? '...' : ''}`,
        affectedUrl: page.url,
        whyItMatters:
          'Alt text is essential for visual impairment accessibility (WCAG 2.2 AA) and allows search engines to index image content for Google Images and multimodal search.',
        confidence: 'high',
        recommendedFix: 'Add descriptive, contextual alt attributes to all content images. For decorative images, use alt="".',
        implementationExample: '<img src="/product.jpg" alt="Comprehensive SearchScope dashboard displaying technical SEO audit metrics" />',
        effort: 'moderate',
        validationInstructions: 'Inspect images to verify all <img> tags have meaningful alt attributes.',
      });
    }

    // 5. Image dimensions (CLS prevention)
    const imagesWithoutDims = page.images.filter((img) => !img.hasExplicitDimensions);
    if (imagesWithoutDims.length > 2) {
      findings.push({
        id: `PERF-IMAGE-DIMENSIONS-${page.normalizedUrl}`,
        category: 'performance',
        severity: 'low',
        title: `Images lack explicit width and height (${imagesWithoutDims.length} images)`,
        evidence: `${imagesWithoutDims.length} images do not have explicit width and height attributes in HTML.`,
        affectedUrl: page.url,
        whyItMatters:
          'Images without explicit width and height attributes cause layout shifts as they load, negatively affecting Cumulative Layout Shift (CLS), a Core Web Vital.',
        confidence: 'high',
        recommendedFix: 'Specify width and height attributes on <img> tags or set aspect-ratio in CSS.',
        effort: 'quick_win',
        validationInstructions: 'Verify width and height attributes on <img> tags.',
      });
    }

    // 6. Language declaration
    if (!page.lang) {
      findings.push({
        id: `ONPAGE-LANG-MISSING-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'medium',
        title: 'Missing HTML lang attribute',
        evidence: 'The root <html> tag does not specify a lang attribute.',
        affectedUrl: page.url,
        whyItMatters:
          'The lang attribute enables search engines and screen readers to pronounce words correctly and identify the page primary language for geotargeting.',
        confidence: 'high',
        recommendedFix: 'Add the lang attribute to the <html> opening tag.',
        implementationExample: '<html lang="en">',
        effort: 'quick_win',
        validationInstructions: 'Verify <html lang="..."> is set in document source.',
      });
    }

    // 7. Open Graph
    if (!page.ogTitle || !page.ogImage) {
      findings.push({
        id: `ONPAGE-OG-MISSING-${page.normalizedUrl}`,
        category: 'onpage',
        severity: 'low',
        title: 'Incomplete Open Graph social metadata',
        evidence: `Missing: ${[!page.ogTitle ? 'og:title' : '', !page.ogImage ? 'og:image' : ''].filter(Boolean).join(', ')}`,
        affectedUrl: page.url,
        whyItMatters:
          'Open Graph tags control rich preview cards when your page is shared on LinkedIn, X/Twitter, Slack, and messaging platforms.',
        confidence: 'high',
        recommendedFix: 'Add Open Graph meta tags for og:title, og:description, and og:image.',
        implementationExample: `<meta property="og:title" content="${page.title || 'Page Title'}" />\n<meta property="og:image" content="https://example.com/social-share.jpg" />`,
        effort: 'quick_win',
        validationInstructions: 'Check tags using social card validator or inspect <head>.',
      });
    }
  }

  // Duplicate Titles Check
  for (const [title, urlList] of titleMap.entries()) {
    if (urlList.length > 1) {
      findings.push({
        id: `ONPAGE-DUPLICATE-TITLE-${encodeURIComponent(title.slice(0, 30))}`,
        category: 'onpage',
        severity: 'high',
        title: `Duplicate <title> tag shared across ${urlList.length} pages`,
        evidence: `Title "${title}" is duplicated on: ${urlList.slice(0, 3).join(', ')}${urlList.length > 3 ? '...' : ''}`,
        affectedUrl: urlList[0],
        whyItMatters:
          'Duplicate titles create internal keyword cannibalization and make it harder for search engines to determine which page best satisfies user intent.',
        confidence: 'high',
        recommendedFix: 'Make each page title unique and specific to the individual page topic.',
        effort: 'moderate',
        validationInstructions: 'Re-crawl and confirm distinct titles across all indexed URLs.',
      });
    }
  }

  return findings;
}
