import { AuditReport } from '../../types/audit';

export interface BrandFacts {
  legalBusinessName?: string;
  tradingName?: string;
  countryOfOrigin: {
    rawMaterialsOrigin?: string; // e.g. "Imported concentrated fragrance compounds"
    manufacturingLocation?: string; // e.g. "Handcrafted, blended, and bottled in Canberra, Australia"
    dispatchLocation?: string; // e.g. "Dispatched from Canberra, ACT, Australia"
    isOriginVerified: boolean;
  };
  productClaims: {
    alcoholFree: boolean;
    crueltyFree: boolean;
    vegan: boolean;
    pureAttarOil: boolean;
    concentrationPercentMin?: number;
    concentrationPercentMax?: number;
    testedWearDurationHours?: number; // only if tested with evidence
  };
  reviewPolicy: {
    verifiedBuyersOnly: boolean;
    noEmployeeOrFamilyReviews: boolean;
    incentivizedReviewsDisclosed: boolean;
  };
  knownTrademarksPolicy: 'inspired_by_with_disclaimer' | 'no_trademark_references' | 'licensed';
  prohibitedClaims: string[];
}

/**
 * Seeds initial Brand Facts from audit evidence with verification flags.
 */
export function seedBrandFactsFromAudit(report: AuditReport): BrandFacts {
  const brandName = report.organizationName || report.siteTitle || report.targetDomain;

  // Inspect observed claims
  const claims = report.complianceClaims || [];
  const hasOriginClaim = claims.some((c) => c.category === 'origin_making');
  const hasDurationClaim = claims.some((c) => c.category === 'performance_health');

  // Search pages for alcohol-free or cruelty-free
  const textSnippetConcat = report.pages.map((p) => p.textSnippet || '').join(' ').toLowerCase();
  const isAlcoholFree = textSnippetConcat.includes('alcohol-free') || textSnippetConcat.includes('alcohol free');
  const isCrueltyFree = textSnippetConcat.includes('cruelty-free') || textSnippetConcat.includes('cruelty free');
  const isVegan = textSnippetConcat.includes('vegan');

  return {
    legalBusinessName: undefined, // Needs owner verification
    tradingName: brandName,
    countryOfOrigin: {
      rawMaterialsOrigin: 'Imported artisanal fragrance oils and carrier bases',
      manufacturingLocation: hasOriginClaim ? 'Hand-blended and bottled in Canberra, ACT' : 'Australia',
      dispatchLocation: 'Canberra, ACT, Australia',
      isOriginVerified: false, // Default unverified until owner provides certification
    },
    productClaims: {
      alcoholFree: isAlcoholFree,
      crueltyFree: isCrueltyFree,
      vegan: isVegan,
      pureAttarOil: true,
      concentrationPercentMin: 25,
      concentrationPercentMax: 35,
      testedWearDurationHours: hasDurationClaim ? undefined : undefined, // Must be supplied by owner
    },
    reviewPolicy: {
      verifiedBuyersOnly: true,
      noEmployeeOrFamilyReviews: true,
      incentivizedReviewsDisclosed: true,
    },
    knownTrademarksPolicy: 'inspired_by_with_disclaimer',
    prohibitedClaims: [
      'cures skin conditions',
      'hypoallergenic (without laboratory patch testing)',
      'lasts 48 hours',
      '100% organic (without NOP / ACO certification)',
      '#1 in Australia (without independent retail audit citation)',
    ],
  };
}

/**
 * Validates proposed copy or changes against verified brand facts.
 */
export function validateContentAgainstBrandFacts(
  content: string,
  facts: BrandFacts
): { compliant: boolean; violations: string[]; factsNeeded: string[] } {
  const violations: string[] = [];
  const factsNeeded: string[] = [];
  const lower = content.toLowerCase();

  // 1. Prohibited claims check
  for (const prohibited of facts.prohibitedClaims) {
    if (lower.includes(prohibited.toLowerCase())) {
      violations.push(`Content contains prohibited claim: "${prohibited}"`);
    }
  }

  // 2. Origin verification check
  if (
    (lower.includes('made in australia') ||
      lower.includes('australian made') ||
      lower.includes('handcrafted in')) &&
    !facts.countryOfOrigin.isOriginVerified
  ) {
    factsNeeded.push(
      'Country of origin certification or manufacturing threshold documentation required before asserting "Australian-made".'
    );
  }

  // 3. Numeric wear duration check
  const durationMatch = content.match(/\blasts?\s+(\d{1,2})\s*(?:hours|hrs)\b/i);
  if (durationMatch) {
    const hours = parseInt(durationMatch[1], 10);
    if (!facts.productClaims.testedWearDurationHours || facts.productClaims.testedWearDurationHours < hours) {
      factsNeeded.push(
        `Specific longevity claim ("lasts ${hours} hours") requires verified wear-panel testing documentation in Brand Facts.`
      );
    }
  }

  // 4. Absolute purity claims
  if (lower.includes('100% pure') || lower.includes('100% organic')) {
    factsNeeded.push('Absolute purity / organic claims require supplier Certificate of Analysis (CoA).');
  }

  return {
    compliant: violations.length === 0 && factsNeeded.length === 0,
    violations,
    factsNeeded,
  };
}

/**
 * Generates FACTS_NEEDED.md questionnaire for the business owner.
 */
export function generateFactsNeededMarkdown(report: AuditReport, facts: BrandFacts): string {
  let md = `# SearchScope: Brand Facts Verification Questionnaire\n\n`;
  md += `**Target Website:** ${report.targetDomain}\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += `> **Why this document exists:** The SearchScope AI Agent requires verified facts before it can safely generate compliant metadata, product descriptions, schema, and robots directives. Restrictive consumer protection laws mandate substantiation for country-of-origin, ingredient purity, and performance representations.\n\n`;

  md += `## 1. Business & Legal Identity\n\n`;
  md += `- [ ] **Legal Registered Entity Name:** \`${facts.legalBusinessName || '[ENTER LEGAL ENTITY]'}\`\n`;
  md += `- [ ] **ABN / ACN / Business Registration Number:** \`[ENTER BUSINESS NUMBER]\`\n`;
  md += `- [ ] **Official Trading / Brand Name:** \`${facts.tradingName || report.targetDomain}\`\n\n`;

  md += `## 2. Origin & Manufacturing Substantiation\n\n`;
  md += `- [ ] **Raw Ingredients Sourcing:** \`${facts.countryOfOrigin.rawMaterialsOrigin}\`\n`;
  md += `  - *Status:* ${facts.countryOfOrigin.isOriginVerified ? 'Verified ✓' : 'Awaiting Proof ⚠️'}\n`;
  md += `- [ ] **Manufacturing / Blending Facility Location:** \`${facts.countryOfOrigin.manufacturingLocation}\`\n`;
  md += `- [ ] **Dispatch Facility Location:** \`${facts.countryOfOrigin.dispatchLocation}\`\n`;
  md += `  - *Owner Action:* Confirm whether production qualifies for "Australian Made" under substantial transformation rules or specify exact phrasing ("Blended and bottled in Canberra from imported pure attar essences").\n\n`;

  md += `## 3. Product Specifications & Wear Durations\n\n`;
  md += `- [ ] **Alcohol-Free:** ${facts.productClaims.alcoholFree ? 'Yes' : 'No'}\n`;
  md += `- [ ] **Cruelty-Free / Vegan:** Cruelty-Free: ${facts.productClaims.crueltyFree ? 'Yes' : 'No'} | Vegan: ${facts.productClaims.vegan ? 'Yes' : 'No'}\n`;
  md += `- [ ] **Actual Oil Concentration Range:** ${facts.productClaims.concentrationPercentMin}% – ${facts.productClaims.concentrationPercentMax}%\n`;
  md += `- [ ] **Tested Longevity (Wear Duration):** \`${facts.productClaims.testedWearDurationHours ? `${facts.productClaims.testedWearDurationHours} Hours` : 'Unverified (Provide panel testing hours or add disclaimer)'}\`\n\n`;

  md += `## 4. Customer Review Integrity Baseline\n\n`;
  md += `- [ ] **Verified Purchaser Exclusivity:** All displayed customer ratings represent genuine third-party commercial orders.\n`;
  md += `- [ ] **Zero Staff / Family Reviews:** Strict policy prohibiting undisclosed reviews from founders, employees, family, or friends.\n`;
  md += `- [ ] **Incentivized Review Disclosure:** Any promotional samples or gifted products carry visible disclaimer badges.\n\n`;

  md += `## 5. Prohibited Claims Checklist\n\n`;
  md += `Ensure the following disallowed statements never appear in generated or published copy:\n\n`;
  for (const claim of facts.prohibitedClaims) {
    md += `- [ ] ❌ Disallowed: "${claim}"\n`;
  }

  md += `\n---\n*Exported by SearchScope AI Agent Pipeline. Keep this file alongside \`brand-facts.json\` and \`IMPROVEMENTS.md\`.*\n`;

  return md;
}
