import { ExtractedPageData, Finding } from '../../types/audit';
import { classifyPageType } from './page-classifier';

export function analyzeContentQuality(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  let siteHasAboutOrContact = false;

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    if (page.hasContactOrAboutEvidence) {
      siteHasAboutOrContact = true;
    }

    const pageType = page.pageType || classifyPageType(page);

    // 1. Calibrated Content-Depth Analysis by Page Type
    if (pageType === 'utility' || pageType === 'contact' || pageType === 'policy') {
      // Contact, policy, legal, and utility pages are legitimately concise and exempt from thin content penalties.
    } else if (pageType === 'product') {
      if (page.wordCount < 150) {
        findings.push({
          id: `CONTENT-THIN-PRODUCT-CRITICAL-${page.normalizedUrl}`,
          category: 'content',
          severity: 'high',
          title: `Critically thin product copy (${page.wordCount} words)`,
          evidence: `Product page contains only ${page.wordCount} words. Product landing pages require sufficient description for search indexing and shopper decision-making.`,
          affectedUrl: page.url,
          whyItMatters:
            'Thin product pages struggle to rank against competitors, lack long-tail keyword coverage, and may be demoted by helpful-content quality filters.',
          confidence: 'high',
          recommendedFix:
            'Expand product copy to 300+ words by detailing fragrance notes/accords, craftsmanship, ingredients, usage directions, and answers to common customer questions.',
          effort: 'moderate',
          validationInstructions: 'Verify product description and specifications exceed 300 words.',
        });
      } else if (page.wordCount < 300) {
        findings.push({
          id: `CONTENT-DEPTH-PRODUCT-MODERATE-${page.normalizedUrl}`,
          category: 'content',
          severity: 'medium',
          title: `Moderate product content depth (${page.wordCount} words)`,
          evidence: `Product page has ${page.wordCount} words. While indexed, comprehensive commercial coverage targets 300+ words.`,
          affectedUrl: page.url,
          whyItMatters:
            'Expanding product copy beyond basic specs allows search engines and generative AI engines (AEO/GEO) to extract direct answers about longevity, scent profile, and ingredients.',
          confidence: 'medium',
          recommendedFix:
            'Add structured sections: olfactory breakdown (top/heart/base notes), suggested occasions/seasonality, application tips, and an FAQ accordion.',
          effort: 'quick_win',
          validationInstructions: 'Verify product text reaches 300+ words with rich sensory descriptions.',
        });
      }
    } else if (pageType === 'article') {
      if (page.wordCount < 400) {
        findings.push({
          id: `CONTENT-THIN-ARTICLE-${page.normalizedUrl}`,
          category: 'content',
          severity: 'high',
          title: `Thin informational article (${page.wordCount} words)`,
          evidence: `Blog/article contains only ${page.wordCount} words. Comprehensive informational content typically requires 800+ words.`,
          affectedUrl: page.url,
          whyItMatters:
            'Short informational articles rarely rank for competitive informational queries and underperform in AI answer citations.',
          confidence: 'high',
          recommendedFix:
            'Expand the article to 800–1,200 words with in-depth analysis, structured subheadings (H2/H3), comparison tables, and expert commentary.',
          effort: 'moderate',
          validationInstructions: 'Verify article contains 800+ words of original, comprehensive content.',
        });
      } else if (page.wordCount < 800) {
        findings.push({
          id: `CONTENT-DEPTH-ARTICLE-MODERATE-${page.normalizedUrl}`,
          category: 'content',
          severity: 'medium',
          title: `Moderate article content depth (${page.wordCount} words)`,
          evidence: `Article contains ${page.wordCount} words. Recommended depth for comprehensive topic authority is 800+ words.`,
          affectedUrl: page.url,
          whyItMatters:
            'In-depth topical guides build stronger topical authority and earn higher link equity and AI citations than short overview posts.',
          confidence: 'medium',
          recommendedFix:
            'Deepen topic coverage with practical examples, step-by-step guidance, and authoritative citations.',
          effort: 'quick_win',
          validationInstructions: 'Expand article to 800+ words with expert insights.',
        });
      }
    } else if (pageType === 'collection') {
      const productLinkCount =
        page.internalLinks?.filter((l) =>
          /\/product\/|\/products\/|\/item\//i.test(l.url)
        ).length || 0;

      // If collection has 4+ products and at least 100 words, it's healthy.
      // If word count is below 100, flag as low severity intro copy gap.
      if (page.wordCount < 100) {
        findings.push({
          id: `CONTENT-COLLECTION-INTRO-BRIEF-${page.normalizedUrl}`,
          category: 'content',
          severity: 'low',
          title: `Brief category description copy (${page.wordCount} words)`,
          evidence: `Category/collection page has ${page.wordCount} words with ${productLinkCount} catalog items.`,
          affectedUrl: page.url,
          whyItMatters:
            'A 100–250 word category introduction provides search engines and shoppers with contextual signals about the collection without pushing product grids below the fold.',
          confidence: 'medium',
          recommendedFix:
            'Add 100–200 words of introductory category copy explaining the collection theme, unique formulations, and buying guidance.',
          effort: 'quick_win',
          validationInstructions: 'Verify collection page includes 100–200 words of contextual copy.',
        });
      }
    } else {
      // Home or other landing pages
      if (page.wordCount < 180) {
        findings.push({
          id: `CONTENT-THIN-${page.normalizedUrl}`,
          category: 'content',
          severity: 'medium',
          title: `Low textual content depth (${page.wordCount} words)`,
          evidence: `Page body contains only ${page.wordCount} words (excluding navigation and boilerplate).`,
          affectedUrl: page.url,
          whyItMatters:
            'Thin content pages struggle to rank for substantive search queries and risk being classified as low-quality or doorway pages by Google Helpful Content systems.',
          confidence: 'medium',
          recommendedFix:
            'Expand page content to thoroughly address search intent, provide brand background, and feature key offerings.',
          effort: 'moderate',
          validationInstructions: 'Verify body copy exceeds 250 words with unique, high-value information.',
        });
      }
    }

    // 2. Readability Analysis
    if (page.wordCount > 300 && page.fleschKincaidReadingEase !== undefined && page.fleschKincaidReadingEase < 30) {
      findings.push({
        id: `CONTENT-READABILITY-DENSE-${page.normalizedUrl}`,
        category: 'content',
        severity: 'low',
        title: `Very dense or difficult readability (Score: ${page.fleschKincaidReadingEase}/100)`,
        evidence: `Flesch Reading Ease score is ${page.fleschKincaidReadingEase}. Sentences and syllables indicate college graduate reading difficulty.`,
        affectedUrl: page.url,
        whyItMatters:
          'High reading difficulty increases bounce rates and reduces user engagement. Search engines favor clear, accessible language that directly answers queries.',
        confidence: 'medium',
        recommendedFix: 'Break up long sentences, substitute complex jargon with clearer terminology, and introduce subheadings and bullet lists.',
        effort: 'quick_win',
        validationInstructions: 'Re-evaluate text readability target score of 50–70.',
      });
    }

    // 3. Author Attribution on deep content
    if (page.wordCount > 600 && !page.hasAuthorAttribution) {
      findings.push({
        id: `CONTENT-EEAT-AUTHOR-MISSING-${page.normalizedUrl}`,
        category: 'content',
        severity: 'low',
        title: 'Long-form content lacks explicit author attribution or credentials',
        evidence: `Article length is ${page.wordCount} words, but no author byline, author link, or Person schema was detected.`,
        affectedUrl: page.url,
        whyItMatters:
          'Google Search Quality Rater Guidelines emphasize E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness). Clear bylines build user trust and machine credibility.',
        confidence: 'medium',
        recommendedFix: 'Include an author byline with author credentials, bio, and link to an author profile page.',
        implementationExample: '<p class="author-byline">Written by <a href="/author/jane-doe" rel="author">Jane Doe</a>, Lead Systems Architect</p>',
        effort: 'quick_win',
        validationInstructions: 'Confirm author name and byline element render on the page.',
      });
    }
  }

  // 4. Site-wide Trust & Transparency signals
  if (!siteHasAboutOrContact && pages.length >= 3) {
    findings.push({
      id: 'CONTENT-TRUST-SIGNALS-MISSING',
      category: 'content',
      severity: 'medium',
      title: 'Missing visible trust and transparency links (About Us, Contact, Privacy)',
      evidence: 'None of the crawled pages contained links to About Us, Contact, or Privacy Policy pages.',
      affectedUrl: pages[0]?.url || 'Root',
      whyItMatters:
        'Search engine quality algorithms look for clear organizational ownership, contact details, and accountability policies as key indicators of legitimate, trustworthy websites.',
      confidence: 'high',
      recommendedFix: 'Ensure sitewide footer navigation includes clear links to About Us, Contact information, and Privacy Policy.',
      effort: 'quick_win',
      validationInstructions: 'Verify footer contains visible links to About, Contact, and Privacy.',
    });
  }

  return findings;
}
