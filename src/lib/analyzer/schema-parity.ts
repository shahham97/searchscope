import { ExtractedPageData, Finding } from '../../types/audit';

export function analyzeSchemaDomParity(pages: ExtractedPageData[]): Finding[] {
  const findings: Finding[] = [];

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    const lowerBody = (page.textSnippet || '').toLowerCase();
    // We can also test against raw text if needed
    for (const schema of page.structuredData) {
      if (!schema.isValid || !schema.rawJson) continue;

      let parsed: any;
      try {
        parsed = JSON.parse(schema.rawJson);
      } catch {
        continue;
      }

      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        // 1. FAQPage Parity
        if (item['@type'] === 'FAQPage' && Array.isArray(item.mainEntity)) {
          const missingQuestions: string[] = [];

          for (const qObj of item.mainEntity) {
            const questionText = qObj?.name?.trim();
            if (questionText) {
              const qSnippet = questionText.toLowerCase().slice(0, 40);
              if (!lowerBody.includes(qSnippet)) {
                missingQuestions.push(`"${questionText}"`);
              }
            }
          }

          if (missingQuestions.length > 0) {
            findings.push({
              id: `SCHEMA-FAQ-DOM-MISMATCH-${page.normalizedUrl}`,
              category: 'structured_data',
              severity: 'high',
              title: `FAQPage schema questions missing from visible page content (${missingQuestions.length} questions)`,
              evidence: `JSON-LD declares FAQ questions that could not be verified in the visible DOM text on ${page.url}:\n• ${missingQuestions.slice(0, 3).join('\n• ')}`,
              affectedUrl: page.url,
              whyItMatters:
                'Google Structured Data Guidelines strictly prohibit markup for content that is not visible to human users. Hidden or phantom FAQ schema can result in manual action penalties or loss of rich snippet eligibility.',
              confidence: 'high',
              recommendedFix:
                'Ensure all questions and answers declared in FAQPage JSON-LD are clearly rendered and visible on the page (e.g. in an accordion or FAQ section).',
              effort: 'quick_win',
              validationInstructions:
                'Check that every question in the JSON-LD schema is readable on the rendered webpage.',
            });
          }
        }

        // 2. Product Review / AggregateRating Parity
        if (item['@type'] === 'Product' && item.aggregateRating) {
          const ratingVal = item.aggregateRating.ratingValue;
          const reviewCount = item.aggregateRating.reviewCount || item.aggregateRating.ratingCount;

          // Check if page mentions reviews or stars
          const hasReviewInBody =
            lowerBody.includes('review') ||
            lowerBody.includes('rating') ||
            lowerBody.includes('star') ||
            lowerBody.includes(String(ratingVal));

          if (!hasReviewInBody && reviewCount && Number(reviewCount) > 0) {
            findings.push({
              id: `SCHEMA-REVIEW-DOM-MISMATCH-${page.normalizedUrl}`,
              category: 'structured_data',
              severity: 'high',
              title: 'Product aggregateRating declared in schema without visible reviews on page',
              evidence: `Product schema declares aggregateRating of ${ratingVal} (${reviewCount} reviews), but no visible customer reviews or rating summary could be detected on the page.`,
              affectedUrl: page.url,
              whyItMatters:
                'Google Merchant Center and Rich Results policies require reviews marked up in Product schema to correspond to visible, authentic reviews displayed directly on the product landing page.',
              confidence: 'medium',
              recommendedFix:
                'Display customer reviews directly on the product page or remove aggregateRating markup if reviews are collected elsewhere.',
              effort: 'moderate',
              validationInstructions:
                'Verify that customer ratings and review count are visibly displayed in the product template.',
            });
          }
        }
      }
    }
  }

  return findings;
}
