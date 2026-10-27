import { PageType } from '../../types/audit';
import { classifyUrlOnly } from '../analyzer/page-classifier';

export interface CrawlCandidate {
  url: string;
  normalizedUrl: string;
  depth: number;
  discoveredFrom?: string;
  pageType?: PageType;
}

export interface StratifiedSampleResult {
  sampled: CrawlCandidate[];
  unselected: CrawlCandidate[];
  distributionSummary: string;
  pageTypeCounts: Record<PageType, number>;
  depthCounts: Record<number, number>;
  totalDiscovered: number;
  totalSampled: number;
}

/**
 * Performs stratified sampling across page types and click depths
 * when discovered URLs exceed the crawl capacity limit.
 *
 * Guarantees representation across:
 * - Page types: home, collection, product, article, about, contact, policy, utility
 * - Click depths: 0, 1, 2, 3+
 */
export function sampleStratifiedCandidates(
  candidates: CrawlCandidate[],
  targetLimit: number
): StratifiedSampleResult {
  const totalDiscovered = candidates.length;

  // Initialize count tracking
  const pageTypeCounts: Record<PageType, number> = {
    home: 0,
    collection: 0,
    product: 0,
    article: 0,
    about: 0,
    contact: 0,
    policy: 0,
    utility: 0,
  };

  const depthCounts: Record<number, number> = {};

  if (targetLimit <= 0 || candidates.length === 0) {
    return {
      sampled: [],
      unselected: [...candidates],
      distributionSummary: `Showing 0 sampled from ${totalDiscovered} discovered`,
      pageTypeCounts,
      depthCounts,
      totalDiscovered,
      totalSampled: 0,
    };
  }

  // If candidate count is within limit, return all without truncation
  if (candidates.length <= targetLimit) {
    for (const item of candidates) {
      const pType = item.pageType || classifyUrlOnly(item.url);
      pageTypeCounts[pType] = (pageTypeCounts[pType] || 0) + 1;
      depthCounts[item.depth] = (depthCounts[item.depth] || 0) + 1;
    }

    const distinctTypes = Object.values(pageTypeCounts).filter((c) => c > 0).length;
    const distinctDepths = Object.keys(depthCounts).length;
    return {
      sampled: [...candidates],
      unselected: [],
      distributionSummary: `Showing ${candidates.length} sampled from ${totalDiscovered} discovered across ${distinctTypes} page types and ${distinctDepths} click depths`,
      pageTypeCounts,
      depthCounts,
      totalDiscovered,
      totalSampled: candidates.length,
    };
  }

  // Pre-classify all candidates
  const enrichedCandidates = candidates.map((item) => ({
    ...item,
    effectiveType: item.pageType || classifyUrlOnly(item.url),
    clampedDepth: Math.min(Math.max(item.depth, 0), 3), // 0, 1, 2, 3+
  }));

  // Identify true homepage candidates (effectiveType === 'home')
  const homeCandidates: typeof enrichedCandidates = [];
  const otherCandidates: typeof enrichedCandidates = [];

  for (const c of enrichedCandidates) {
    if (c.effectiveType === 'home') {
      homeCandidates.push(c);
    } else {
      otherCandidates.push(c);
    }
  }

  const sampledSet = new Set<string>();
  const sampled: CrawlCandidate[] = [];

  // 1. Reserve primary homepage(s) first (at most 2 slots: root / localized root)
  const maxHomeSlots = Math.min(homeCandidates.length, 2);
  for (let i = 0; i < maxHomeSlots && sampled.length < targetLimit; i++) {
    const home = homeCandidates[i];
    if (!sampledSet.has(home.normalizedUrl)) {
      sampled.push({
        url: home.url,
        normalizedUrl: home.normalizedUrl,
        depth: home.depth,
        discoveredFrom: home.discoveredFrom,
        pageType: home.effectiveType,
      });
      sampledSet.add(home.normalizedUrl);
    }
  }

  // Any remaining homeCandidates become part of otherCandidates so they compete fairly
  for (let i = maxHomeSlots; i < homeCandidates.length; i++) {
    otherCandidates.push(homeCandidates[i]);
  }

  const remainingQuota = targetLimit - sampled.length;

  if (remainingQuota > 0) {
    // 2. Group other candidates by (effectiveType, clampedDepth) stratum
    const strata = new Map<string, typeof enrichedCandidates>();
    for (const c of otherCandidates) {
      const key = `${c.effectiveType}__d${c.clampedDepth}`;
      const bucket = strata.get(key) || [];
      bucket.push(c);
      strata.set(key, bucket);
    }

    // Sort candidates within each stratum by depth ascending, then by URL length (cleaner URLs first)
    for (const [key, bucket] of strata.entries()) {
      bucket.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.url.length - b.url.length;
      });
      strata.set(key, bucket);
    }

    const stratumKeys = Array.from(strata.keys());
    let currentQuota = remainingQuota;

    // Phase A: Guarantee at least 1-2 representations per stratum if quota permits
    const basePickPerStratum = Math.max(1, Math.floor(currentQuota / (stratumKeys.length * 2)));
    const stratumIndices = new Map<string, number>();

    for (const key of stratumKeys) {
      stratumIndices.set(key, 0);
      const bucket = strata.get(key)!;
      const toTake = Math.min(bucket.length, basePickPerStratum, currentQuota);

      for (let i = 0; i < toTake; i++) {
        const item = bucket[i];
        if (!sampledSet.has(item.normalizedUrl)) {
          sampled.push({
            url: item.url,
            normalizedUrl: item.normalizedUrl,
            depth: item.depth,
            discoveredFrom: item.discoveredFrom,
            pageType: item.effectiveType,
          });
          sampledSet.add(item.normalizedUrl);
          currentQuota--;
        }
      }
      stratumIndices.set(key, toTake);
      if (currentQuota <= 0) break;
    }

    // Phase B: Proportional round-robin allocation for remaining quota
    while (currentQuota > 0) {
      let madeProgress = false;
      for (const key of stratumKeys) {
        if (currentQuota <= 0) break;
        const bucket = strata.get(key)!;
        const index = stratumIndices.get(key) || 0;
        if (index < bucket.length) {
          const item = bucket[index];
          stratumIndices.set(key, index + 1);
          if (!sampledSet.has(item.normalizedUrl)) {
            sampled.push({
              url: item.url,
              normalizedUrl: item.normalizedUrl,
              depth: item.depth,
              discoveredFrom: item.discoveredFrom,
              pageType: item.effectiveType,
            });
            sampledSet.add(item.normalizedUrl);
            currentQuota--;
            madeProgress = true;
          }
        }
      }
      if (!madeProgress) {
        break; // All strata exhausted
      }
    }
  }

  // Collect unselected candidates
  const unselected: CrawlCandidate[] = [];
  for (const c of candidates) {
    if (!sampledSet.has(c.normalizedUrl)) {
      unselected.push(c);
    }
  }

  // Compute final counts
  for (const item of sampled) {
    const pType = item.pageType || classifyUrlOnly(item.url);
    pageTypeCounts[pType] = (pageTypeCounts[pType] || 0) + 1;
    depthCounts[item.depth] = (depthCounts[item.depth] || 0) + 1;
  }

  const distinctTypes = Object.values(pageTypeCounts).filter((c) => c > 0).length;
  const distinctDepths = Object.keys(depthCounts).length;
  const distributionSummary = `Showing ${sampled.length} sampled from ${totalDiscovered} discovered across ${distinctTypes} page types and ${distinctDepths} click depths`;

  return {
    sampled,
    unselected,
    distributionSummary,
    pageTypeCounts,
    depthCounts,
    totalDiscovered,
    totalSampled: sampled.length,
  };
}
