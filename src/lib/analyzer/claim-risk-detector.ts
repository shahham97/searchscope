import { ExtractedPageData, Finding, ClaimItem, ClaimCategory, ClaimRiskLevel } from '../../types/audit';

const TRADEMARK_TARGETS = [
  'baccarat rouge 540',
  'baccarat rouge',
  'santal 33',
  'aventus',
  'sauvage',
  'tom ford',
  'creed',
  'bleu de chanel',
  'lost cherry',
  'tobacco vanille',
  'black orchid',
  'tuscan leather',
  'oud wood',
  'libre',
  'la vie est belle',
  'black opium',
];

export interface ClaimRiskResult {
  claims: ClaimItem[];
  findings: Finding[];
}

export function analyzeContentClaimsAndRisks(pages: ExtractedPageData[]): ClaimRiskResult {
  const claims: ClaimItem[] = [];
  const findings: Finding[] = [];

  let claimCounter = 1;

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    const fullText = (page.textSnippet || '') + ' ' + (page.metaDescription || '') + ' ' + page.h1s.join(' ');
    const lowerText = fullText.toLowerCase();

    // 1. Origin / Making Claims
    const originMatch = fullText.match(
      /\b((?:handcrafted|hand-poured|hand-crafted|crafted|made|manufactured|formulated|produced)\s+in\s+([A-Za-z\s,]{3,30}))\b/i
    ) || fullText.match(/\b(australian[- ]made|made in australia|made in france|made in usa)\b/i);

    if (originMatch) {
      const claimText = originMatch[0].trim();
      const claim: ClaimItem = {
        id: `CLAIM-ORIGIN-${claimCounter++}`,
        category: 'origin_making',
        riskLevel: 'high',
        claimText,
        url: page.url,
        location: 'Product / Storefront Copy',
        whyRisky:
          'Country-of-origin claims (e.g. "Australian-made", "handcrafted in Canberra") are strictly regulated under consumer protection law (e.g. ACCC Country of Origin Guidelines). Substantial transformation or origin thresholds must be demonstrably met.',
        ownerAction: 'Confirm and supply manufacturing records or origin certification, or reword to describe formulation design.',
        verified: false,
      };
      claims.push(claim);

      findings.push({
        id: `COMPLIANCE-CLAIM-ORIGIN-${page.normalizedUrl}`,
        category: 'content',
        severity: 'high',
        title: `Origin / manufacturing claim requires verification: "${claimText}"`,
        evidence: `Found origin claim on ${page.url}: "${claimText}". (Needs owner verification — not judged false).`,
        affectedUrl: page.url,
        whyItMatters:
          'Regulatory bodies require substantiation for place-of-origin and handcrafted representations. Ensuring verified provenance protects merchant trust and avoids compliance enforcement.',
        confidence: 'high',
        recommendedFix:
          'Confirm supporting documentation for country of origin, or reword to specify the exact manufacturing step performed locally.',
        effort: 'moderate',
        validationInstructions: 'Ensure business documentation verifies the country-of-origin claim.',
      });
    }

    // 2. Ingredient & Purity Claims (100%, pure, organic, vegan, cruelty-free)
    const ingredientMatch = fullText.match(
      /\b(100% pure|pure attar|100% natural|certified organic|all-natural|pure perfume oil|pure fragrance oil|vegan & cruelty-free|cruelty-free)\b/i
    );

    if (ingredientMatch) {
      const claimText = ingredientMatch[0].trim();
      const claim: ClaimItem = {
        id: `CLAIM-INGREDIENT-${claimCounter++}`,
        category: 'ingredient_sourcing',
        riskLevel: 'medium',
        claimText,
        url: page.url,
        location: 'Product Description / Scent Profile',
        whyRisky:
          'Absolute claims like "100% pure", "organic", or "cruelty-free" require complete supply-chain batch testing and certificate verification. Over-claiming botanical purity without documentation invites consumer challenges.',
        ownerAction: 'Confirm batch certificates of analysis (CoA) or clarify carrier oil percentages.',
        verified: false,
      };
      claims.push(claim);

      findings.push({
        id: `COMPLIANCE-CLAIM-INGREDIENT-${page.normalizedUrl}`,
        category: 'content',
        severity: 'medium',
        title: `Purity or ingredient claim requires verification: "${claimText}"`,
        evidence: `Found purity / ingredient claim on ${page.url}: "${claimText}". (Needs owner verification — not judged false).`,
        affectedUrl: page.url,
        whyItMatters:
          'Claims of 100% purity or certification must be backed by supplier certificates of analysis (CoA) to prevent misleading representations.',
        confidence: 'high',
        recommendedFix:
          'Verify that certificates of analysis support this purity representation, or replace absolute terms with specific ingredient descriptions.',
        effort: 'quick_win',
        validationInstructions: 'Confirm supplier CoAs match the stated purity specification.',
      });
    }

    // 3. Performance / Health / Duration Claims
    const durationMatch = fullText.match(/\b(?:lasts|longevity of|projection of)\s+(\d{1,2}[\s–-]+(?:hours|hrs|days))\b/i) ||
      fullText.match(/\b(25[–-]35% pure fragrance oil|zero redness|hypoallergenic|non-toxic|dermatologically tested)\b/i);

    if (durationMatch) {
      const claimText = durationMatch[0].trim();
      const claim: ClaimItem = {
        id: `CLAIM-PERFORMANCE-${claimCounter++}`,
        category: 'performance_health',
        riskLevel: 'high',
        claimText,
        url: page.url,
        location: 'Product Longevity / FAQ Section',
        whyRisky:
          'Specific numeric wear times ("lasts 14 hours") and skin health claims ("zero redness", "hypoallergenic") carry liability if sensitive customers experience skin irritation or shorter duration.',
        ownerAction: 'Confirm wear-testing panel results or add standard cosmetic wear disclaimers ("longevity varies with skin chemistry and application").',
        verified: false,
      };
      claims.push(claim);

      findings.push({
        id: `COMPLIANCE-CLAIM-PERFORMANCE-${page.normalizedUrl}`,
        category: 'content',
        severity: 'high',
        title: `Performance / skin claim requires verification: "${claimText}"`,
        evidence: `Found performance/skin tolerance claim on ${page.url}: "${claimText}". (Needs owner verification — not judged false).`,
        affectedUrl: page.url,
        whyItMatters:
          'Health and duration representations must be accompanied by explicit qualifiers to comply with fair-trading expectations across varying consumer skin types.',
        confidence: 'high',
        recommendedFix:
          'Ensure testing evidence supports this duration, and include standard skin patch test guidance and wear variance disclosures.',
        effort: 'quick_win',
        validationInstructions: 'Verify that longevity claims include standard cosmetic wear disclosures.',
      });
    }

    // 4. Superlatives & Comparative Claims
    const superlativeMatch = fullText.match(
      /(?:^|\s|\b)(world['’]?s\s+best|#\s*1(?:\s+in\s+[A-Za-z]+)?|best\s+of\s+the\s+best|unbeatable\s+quality|guaranteed\s+overnight)\b/i
    );

    if (superlativeMatch) {
      const claimText = superlativeMatch[0].trim();
      const claim: ClaimItem = {
        id: `CLAIM-SUPERLATIVE-${claimCounter++}`,
        category: 'superlative_comparative',
        riskLevel: 'medium',
        claimText,
        url: page.url,
        location: 'Marketing Headlines / Reviews',
        whyRisky:
          'Unsubstantiated superlative claims ("#1 in Australia", "world\'s best") violate advertising standards unless supported by independent market share data or formal award citations.',
        ownerAction: 'Confirm award or ranking survey source, or reword to an authentic brand value statement.',
        verified: false,
      };
      claims.push(claim);

      findings.push({
        id: `COMPLIANCE-CLAIM-SUPERLATIVE-${page.normalizedUrl}`,
        category: 'content',
        severity: 'medium',
        title: `Unsubstantiated superlative detected: "${claimText}"`,
        evidence: `Found superlative phrasing on ${page.url}: "${claimText}". (Needs owner verification — not judged false).`,
        affectedUrl: page.url,
        whyItMatters:
          'Advertising standards require superlative ranking claims ("#1", "best") to be proven with objective evidence or framed as personal customer opinions.',
        confidence: 'high',
        recommendedFix:
          'Provide the formal award/survey citation or replace with distinctive product quality descriptions.',
        effort: 'quick_win',
        validationInstructions: 'Ensure superlative claims cite independent third-party awards or data.',
      });
    }

    // 5. Trademark-Adjacent Brand References
    for (const tm of TRADEMARK_TARGETS) {
      if (lowerText.includes(tm)) {
        const claim: ClaimItem = {
          id: `CLAIM-TRADEMARK-${claimCounter++}`,
          category: 'trademark_adjacent',
          riskLevel: 'advisory',
          claimText: `Reference or inspiration naming adjacent to third-party trademark: "${tm}"`,
          url: page.url,
          location: 'Product Title / Comparison Copy',
          whyRisky:
            'Using or referencing well-known designer fragrance trademarks (e.g. for scent comparison or "inspired by" naming) can trigger trademark infringement notices or ad-network policy rejections unless accompanied by prominent disclaimers.',
          ownerAction: 'Confirm IP counsel review of comparative advertising disclaimers and product naming.',
          verified: false,
        };
        claims.push(claim);

        findings.push({
          id: `COMPLIANCE-TRADEMARK-ADVISORY-${page.normalizedUrl}-${tm.replace(/\s+/g, '-')}`,
          category: 'content',
          severity: 'low',
          title: `Trademark-adjacent naming advisory: "${tm}" referenced`,
          evidence: `Page at ${page.url} mentions or closely resembles recognized third-party fragrance mark "${tm}". Ensure comparative advertising disclaimers are legally sound.`,
          affectedUrl: page.url,
          whyItMatters:
            'Comparative scent marketing requires unambiguous disclaimers stating no affiliation, endorsement, or manufacture by the original trademark holder.',
          confidence: 'high',
          recommendedFix:
            'Ensure clear non-affiliation disclaimers appear prominently beside any comparative scent references.',
          effort: 'quick_win',
          validationInstructions: 'Verify that comparative trademark disclaimers are visible on product pages.',
        });
        break; // Flag once per page
      }
    }
  }

  // 6. Review Integrity Signals (Site-wide guidance)
  findings.push({
    id: `COMPLIANCE-REVIEW-INTEGRITY-GUIDANCE`,
    category: 'content',
    severity: 'informational',
    title: 'Customer review compliance & integrity baseline',
    evidence: 'E-commerce platform publishes customer reviews and star ratings.',
    affectedUrl: pages[0]?.url || 'Root',
    whyItMatters:
      'Consumer protection regulations (such as FTC guidelines and Australian Consumer Law) mandate that reviews must be from genuine, independent purchasers. Reviews from store owners, employees, contractors, friends, or family must NEVER be presented as unsolicited customer reviews without clear, conspicuous disclosure.',
    confidence: 'high',
    recommendedFix:
      'Audit your review collection system to ensure verified buyer badges only apply to authenticated orders, and exclude any internal or family submissions.',
    effort: 'quick_win',
    validationInstructions: 'Verify review moderation policy complies with independent consumer review guidelines.',
  });

  return { claims, findings };
}
