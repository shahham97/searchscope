import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeContentQuality(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  let siteHasAboutOrContact = false;

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    if (page.hasContactOrAboutEvidence) {
      siteHasAboutOrContact = true;
    }

    // 1. Thin Content Heuristic
    const path = new URL(page.url).pathname.toLowerCase();
    const isUtilityPage =
      path.includes('login') ||
      path.includes('signin') ||
      path.includes('signup') ||
      path.includes('cart') ||
      path.includes('checkout') ||
      path.includes('search');

    if (!isUtilityPage && page.wordCount < 180) {
      findings.push({
        id: `CONTENT-THIN-${page.normalizedUrl}`,
        category: 'content',
        severity: 'medium',
        title: `Low textual content depth (${page.wordCount} words)`,
        evidence: `Page body contains only ${page.wordCount} words (excluding navigation and boilerplate).`,
        affectedUrl: page.url,
        whyItMatters:
          'Thin content pages struggle to rank for substantive search queries and risk being classified as low-quality or doorway pages by Google Panda/Helpful Content systems.',
        confidence: 'medium',
        recommendedFix:
          'Expand the page content to thoroughly address search intent, answer common customer questions, and provide actionable details.',
        effort: 'moderate',
        validationInstructions: 'Verify body copy exceeds 300 words with unique, high-value information.',
      });
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
