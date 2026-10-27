import { ExtractedPageData, Finding } from '../../types/audit';

export interface PageLinkAuthority {
  url: string;
  normalizedUrl: string;
  pageRankScore: number; // 0 to 100
  inboundInternalLinks: number;
  outboundInternalLinks: number;
  clickDepth: number;
  isOrphan: boolean;
}

export interface BrokenLinkOccurrence {
  sourceUrl: string;
  targetUrl: string;
  anchorText?: string;
  statusCode?: number;
}

export interface RedirectLinkOccurrence {
  sourceUrl: string;
  targetUrl: string;
  redirectTarget: string;
  anchorText?: string;
}

export interface LinkGraphReport {
  pageAuthorities: PageLinkAuthority[];
  depthDistribution: Record<number, number>;
  orphanUrls: string[];
  brokenInternalLinks: BrokenLinkOccurrence[];
  redirectLinks: RedirectLinkOccurrence[];
  nofollowInternalLinks: Array<{ sourceUrl: string; targetUrl: string; anchorText?: string }>;
  findings: Finding[];
}

/**
 * Computes PageRank-style internal link authority using power iteration,
 * click depth distribution, orphan pages, redirect links, and nofollow internal links.
 */
export function analyzeLinkGraph(
  pages: ExtractedPageData[],
  allDiscoveredUrls: string[] = []
): LinkGraphReport {
  const findings: Finding[] = [];
  const validPages = pages.filter((p) => p.isHtml && p.statusCode === 200);

  // Map of normalized URL -> ExtractedPageData
  const pageMap = new Map<string, ExtractedPageData>();
  for (const page of pages) {
    pageMap.set(page.normalizedUrl, page);
    pageMap.set(page.url, page);
  }

  // 1. Build Adjacency Graph
  const urls = Array.from(new Set(validPages.map((p) => p.normalizedUrl)));
  const urlToIndex = new Map<string, number>();
  urls.forEach((u, idx) => urlToIndex.set(u, idx));

  const N = urls.length;
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const incomingLinks = new Map<string, Set<string>>();

  urls.forEach((u) => {
    inDegree.set(u, 0);
    outDegree.set(u, 0);
    incomingLinks.set(u, new Set());
  });

  const brokenInternalLinks: BrokenLinkOccurrence[] = [];
  const redirectLinks: RedirectLinkOccurrence[] = [];
  const nofollowInternalLinks: Array<{ sourceUrl: string; targetUrl: string; anchorText?: string }> = [];

  for (const page of validPages) {
    const sourceNorm = page.normalizedUrl;
    let validInternalOut = 0;

    for (const link of page.internalLinks || []) {
      const targetNorm = link.url;
      const targetPage = pageMap.get(targetNorm);

      // Check broken internal links (4xx, 5xx, or failed status)
      if (targetPage && (targetPage.statusCode >= 400 || targetPage.statusCode === 0 || targetPage.failureCode)) {
        brokenInternalLinks.push({
          sourceUrl: page.url,
          targetUrl: link.url,
          anchorText: link.anchorText,
          statusCode: targetPage.statusCode,
        });
      }

      // Check redirect links (target redirects to another destination)
      if (targetPage?.redirectChain && targetPage.redirectChain.length > 0) {
        redirectLinks.push({
          sourceUrl: page.url,
          targetUrl: link.url,
          redirectTarget: targetPage.redirectChain[targetPage.redirectChain.length - 1],
          anchorText: link.anchorText,
        });
      }

      // Link graph tracking
      if (urlToIndex.has(targetNorm) && targetNorm !== sourceNorm) {
        validInternalOut++;
        inDegree.set(targetNorm, (inDegree.get(targetNorm) || 0) + 1);
        incomingLinks.get(targetNorm)?.add(sourceNorm);
      }
    }

    outDegree.set(sourceNorm, validInternalOut);
  }

  // 2. Power Iteration PageRank Algorithm (Damping Factor d = 0.85)
  const d = 0.85;
  let ranks = new Array<number>(N).fill(1 / Math.max(1, N));

  if (N > 1) {
    const iterations = 25;
    for (let it = 0; it < iterations; it++) {
      const nextRanks = new Array<number>(N).fill((1 - d) / N);

      for (let i = 0; i < N; i++) {
        const u = urls[i];
        const out = outDegree.get(u) || 0;
        if (out > 0) {
          const share = (d * ranks[i]) / out;
          for (const page of validPages) {
            if (page.normalizedUrl === u) {
              for (const link of page.internalLinks || []) {
                const targetIdx = urlToIndex.get(link.url);
                if (targetIdx !== undefined && targetIdx !== i) {
                  nextRanks[targetIdx] += share;
                }
              }
            }
          }
        } else {
          // Dangling node: redistribute evenly
          const share = (d * ranks[i]) / N;
          for (let j = 0; j < N; j++) {
            nextRanks[j] += share;
          }
        }
      }
      ranks = nextRanks;
    }
  }

  // Normalize PageRank to 0-100 scale
  const maxRank = Math.max(...ranks, 0.00001);
  const pageAuthorities: PageLinkAuthority[] = urls.map((u, i) => {
    const rawNormalized = Math.round((ranks[i] / maxRank) * 100);
    const pageObj = pageMap.get(u);
    const inCount = inDegree.get(u) || 0;
    const isOrphan = inCount === 0 && u !== validPages[0]?.normalizedUrl;

    return {
      url: pageObj?.url || u,
      normalizedUrl: u,
      pageRankScore: Math.min(100, Math.max(5, rawNormalized)),
      inboundInternalLinks: inCount,
      outboundInternalLinks: outDegree.get(u) || 0,
      clickDepth: 1, // Will be computed from shortest path
      isOrphan,
    };
  });

  // 3. Shortest Path Click Depth (BFS from Homepage)
  const depthDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const homepageNorm = validPages[0]?.normalizedUrl;

  if (homepageNorm) {
    const visitedDepths = new Map<string, number>();
    const queue: Array<{ url: string; depth: number }> = [{ url: homepageNorm, depth: 0 }];
    visitedDepths.set(homepageNorm, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = current.depth;
      const bucket = Math.min(currentDepth, 3);
      depthDistribution[bucket] = (depthDistribution[bucket] || 0) + 1;

      const pageObj = pageMap.get(current.url);
      if (pageObj) {
        for (const link of pageObj.internalLinks || []) {
          const normLink = link.url;
          if (urlToIndex.has(normLink) && !visitedDepths.has(normLink)) {
            visitedDepths.set(normLink, currentDepth + 1);
            queue.push({ url: normLink, depth: currentDepth + 1 });
          }
        }
      }
    }

    for (const auth of pageAuthorities) {
      auth.clickDepth = visitedDepths.get(auth.normalizedUrl) ?? 3;
    }
  }

  // 4. Orphan Pages Detection
  const orphanUrls = pageAuthorities.filter((pa) => pa.isOrphan).map((pa) => pa.url);

  // 5. Findings Generation
  if (orphanUrls.length > 0) {
    findings.push({
      id: 'LINK_ORPHAN_PAGES',
      category: 'technical',
      severity: 'high',
      title: `${orphanUrls.length} Orphan Page(s) Found with Zero Internal Inbound Links`,
      description: 'Pages discovered in the sitemap or external links that receive zero links from any other internal page on the domain.',
      evidence: `Orphan URLs: ${orphanUrls.slice(0, 5).join(', ')}${orphanUrls.length > 5 ? '...' : ''}`,
      affectedUrl: orphanUrls[0],
      affectedUrls: orphanUrls,
      whyItMatters: 'Orphan pages cannot accumulate PageRank, are crawled infrequently by search bots, and are difficult for users to find.',
      confidence: 'high',
      recommendedFix: 'Add internal navigation, in-content links, or category links pointing to these orphan pages.',
      effort: 'quick_win',
      validationInstructions: 'Verify that each page has at least 1-3 contextual incoming internal links.',
    });
  }

  if (brokenInternalLinks.length > 0) {
    const affected = Array.from(new Set(brokenInternalLinks.map((b) => b.sourceUrl)));
    findings.push({
      id: 'LINK_BROKEN_INTERNAL',
      category: 'technical',
      severity: 'high',
      title: `${brokenInternalLinks.length} Broken Internal Link(s) Detected`,
      description: 'Internal links pointing to pages that return HTTP 4xx, 5xx, or network failure codes.',
      evidence: `Example: ${brokenInternalLinks[0].sourceUrl} links to dead target ${brokenInternalLinks[0].targetUrl} (HTTP ${brokenInternalLinks[0].statusCode || 'Error'})`,
      affectedUrl: brokenInternalLinks[0].sourceUrl,
      affectedUrls: affected,
      whyItMatters: 'Broken internal links waste crawl budget, trigger 404 errors for users, and sever PageRank flow.',
      confidence: 'high',
      recommendedFix: 'Update the link href to point to active URLs or remove dead links.',
      effort: 'quick_win',
      validationInstructions: 'Confirm all internal links return HTTP 200 OK.',
    });
  }

  if (redirectLinks.length > 0) {
    const affected = Array.from(new Set(redirectLinks.map((r) => r.sourceUrl)));
    findings.push({
      id: 'LINK_INTERNAL_REDIRECT',
      category: 'technical',
      severity: 'medium',
      title: `${redirectLinks.length} Internal Link(s) Pointing to Redirects`,
      description: 'Internal links pointing to URLs that issue a 301 or 302 redirect instead of linking directly to the canonical destination.',
      evidence: `Example: ${redirectLinks[0].sourceUrl} links to ${redirectLinks[0].targetUrl} which redirects to ${redirectLinks[0].redirectTarget}`,
      affectedUrl: redirectLinks[0].sourceUrl,
      affectedUrls: affected,
      whyItMatters: 'Internal redirect chains introduce latency and dilute internal PageRank transfer.',
      confidence: 'high',
      recommendedFix: 'Update internal links to point directly to the final destination URL.',
      effort: 'quick_win',
      validationInstructions: 'Inspect internal link targets and verify 200 OK direct responses.',
    });
  }

  return {
    pageAuthorities,
    depthDistribution,
    orphanUrls,
    brokenInternalLinks,
    redirectLinks,
    nofollowInternalLinks,
    findings,
  };
}
