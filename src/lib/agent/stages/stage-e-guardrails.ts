import { ChangeItem, SiteProfile } from '../types';

export interface QAResult {
  sanitizedChanges: ChangeItem[];
  factsNeededFromOwner: string[];
  qaSummary: {
    totalItems: number;
    passedQa: number;
    flaggedNeedsHuman: number;
    bannedClaimsIntercepted: number;
  };
}

const BANNED_CLAIM_PATTERNS = [
  /\bworld['’]?s\s+best\b/i,
  /\b#\s*1\s+in\s+the\s+world\b/i,
  /\bguaranteed\s+overnight\b/i,
  /\bfda\s+approved\b/i,
  /\bmiracle\s+cure\b/i,
  /\b100%\s+guaranteed\s+results\b/i,
  /\bcheapest\s+in\s+the\s+market\b/i,
  /\bunbeatable\s+lowest\s+price\b/i,
];

export function runStageEGuardrails(
  changes: ChangeItem[],
  siteProfile: SiteProfile
): QAResult {
  const factsSet = new Set<string>();
  let passedQa = 0;
  let flaggedNeedsHuman = 0;
  let bannedClaimsIntercepted = 0;

  const sanitizedChanges = changes.map((item) => {
    let proposed = item.proposed;
    let needsHuman = false;
    const itemFacts: string[] = [];

    // 1. Length checks for Title & Description
    if (item.whereToChange.humanReadable.includes('title') || item.id.includes('title')) {
      if (proposed.length > 65) {
        proposed = proposed.slice(0, 62) + '...';
      }
    } else if (
      item.whereToChange.humanReadable.includes('description') ||
      item.id.includes('desc')
    ) {
      if (proposed.length > 160) {
        proposed = proposed.slice(0, 157) + '...';
      }
    }

    // 2. Banned claims check
    for (const pattern of BANNED_CLAIM_PATTERNS) {
      if (pattern.test(proposed)) {
        bannedClaimsIntercepted++;
        // Intercept and wrap with confirm tag if not already confirmed
        proposed = proposed.replace(pattern, (match) => `[[CONFIRM CLAIM: "${match}"]]`);
        needsHuman = true;
      }
    }

    // 3. Zero-hallucination check: Extract [[CONFIRM: ...]] tags
    const confirmMatches = proposed.match(/\[\[CONFIRM(?:\s+CLAIM)?:\s*([^\]]+)\]\]/gi);
    if (confirmMatches) {
      needsHuman = true;
      for (const rawMatch of confirmMatches) {
        const text = rawMatch.replace(/\[\[CONFIRM(?:\s+CLAIM)?:\s*/i, '').replace(/\]\]$/, '').trim();
        factsSet.add(text);
        itemFacts.push(text);
      }
    }

    // 4. Schema JSON-LD validation
    if (
      item.category === 'structured_data' ||
      (item.category as string) === 'schema' ||
      item.changeType === 'add'
    ) {
      if (proposed.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(proposed);
          if (!parsed['@context'] || !parsed['@type']) {
            needsHuman = true;
          }
        } catch {
          // Schema contains un-substituted template variables or syntax issue
          needsHuman = true;
        }
      }
    }

    const finalQaStatus: 'passed' | 'needs_human' = needsHuman ? 'needs_human' : 'passed';
    if (finalQaStatus === 'passed') {
      passedQa++;
    } else {
      flaggedNeedsHuman++;
    }

    return {
      ...item,
      proposed,
      factsNeeded: itemFacts.length > 0 ? itemFacts : item.factsNeeded,
      qaStatus: finalQaStatus,
    };
  });

  return {
    sanitizedChanges,
    factsNeededFromOwner: Array.from(factsSet),
    qaSummary: {
      totalItems: changes.length,
      passedQa,
      flaggedNeedsHuman,
      bannedClaimsIntercepted,
    },
  };
}
