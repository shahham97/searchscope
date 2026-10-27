import { ExtractedPageData, Finding } from '../../types/audit';

export interface PerformanceMetricSummary {
  crawlerAverageFetchMs: number;
  crawlerSlowestPageMs: number;
  crawlerSlowestUrl?: string;
  crawlerFastestPageMs: number;
  largeDomCount: number;
  uncompressedPagesCount: number;
  excessiveHtmlSizeCount: number;
  highRenderBlockingCount: number;
  isFieldDataAvailable: boolean;
  fieldDataNotice: string;
}

export interface PerformanceAnalysisReport {
  summary: PerformanceMetricSummary;
  findings: Finding[];
}

/**
 * Analyzes synthetic crawler-measured performance signals, DOM depth,
 * compression, and render-blocking resources.
 * Explicitly distinguishes crawler latency from real-user Field Core Web Vitals (CrUX).
 */
export function analyzePerformance(pages: ExtractedPageData[]): PerformanceAnalysisReport {
  const findings: Finding[] = [];
  const validPages = pages.filter((p) => p.isHtml && p.statusCode === 200);

  if (validPages.length === 0) {
    return {
      summary: {
        crawlerAverageFetchMs: 0,
        crawlerSlowestPageMs: 0,
        crawlerFastestPageMs: 0,
        largeDomCount: 0,
        uncompressedPagesCount: 0,
        excessiveHtmlSizeCount: 0,
        highRenderBlockingCount: 0,
        isFieldDataAvailable: false,
        fieldDataNotice: 'No successful HTML pages crawled to measure performance.',
      },
      findings: [],
    };
  }

  let totalDurationMs = 0;
  let slowestMs = -1;
  let slowestUrl = '';
  let fastestMs = Number.MAX_SAFE_INTEGER;
  let largeDomCount = 0;
  let uncompressedPagesCount = 0;
  let excessiveHtmlSizeCount = 0;
  let highRenderBlockingCount = 0;

  const slowPages: Array<{ url: string; durationMs: number }> = [];
  const largeDomPages: Array<{ url: string; domElements: number }> = [];
  const uncompressedPages: string[] = [];
  const heavyHtmlPages: Array<{ url: string; bytes: number }> = [];
  const renderBlockingPages: Array<{ url: string; count: number }> = [];

  for (const page of validPages) {
    const dur = page.fetchDurationMs || 0;
    totalDurationMs += dur;

    if (dur > slowestMs) {
      slowestMs = dur;
      slowestUrl = page.url;
    }
    if (dur < fastestMs) {
      fastestMs = dur;
    }

    // 1. Crawler Response Latency (> 800ms considered slow TTFB/response)
    if (dur > 800) {
      slowPages.push({ url: page.url, durationMs: dur });
    }

    // 2. DOM Element Count (> 1,500 elements flags performance bloat)
    if (page.domElementCount && page.domElementCount > 1500) {
      largeDomCount++;
      largeDomPages.push({ url: page.url, domElements: page.domElementCount });
    }

    // 3. Compression (Uncompressed HTML > 50KB)
    if (!page.hasCompression && page.contentLengthBytes > 50 * 1024) {
      uncompressedPagesCount++;
      uncompressedPages.push(page.url);
    }

    // 4. Excessive HTML Payload Size (> 250KB raw HTML)
    if (page.contentLengthBytes > 250 * 1024) {
      excessiveHtmlSizeCount++;
      heavyHtmlPages.push({ url: page.url, bytes: page.contentLengthBytes });
    }

    // 5. Render-Blocking Resources (> 5 render blocking scripts/stylesheets)
    if (page.renderBlockingResourceCount && page.renderBlockingResourceCount > 5) {
      highRenderBlockingCount++;
      renderBlockingPages.push({ url: page.url, count: page.renderBlockingResourceCount });
    }
  }

  const avgFetchMs = Math.round(totalDurationMs / validPages.length);

  // Findings generation
  if (slowPages.length > 0) {
    const affected = slowPages.map((s) => s.url);
    findings.push({
      id: 'PERF_SLOW_SERVER_RESPONSE',
      category: 'performance',
      severity: slowPages.some((p) => p.durationMs > 2000) ? 'high' : 'medium',
      title: `${slowPages.length} Page(s) Exceeded 800ms Server Fetch Latency`,
      evidence: `Average fetch time: ${avgFetchMs}ms. Slowest page: ${slowestUrl} (${slowestMs}ms). Affected: ${affected.slice(0, 3).join(', ')}`,
      affectedUrl: slowestUrl,
      affectedUrls: affected,
      whyItMatters: 'Slow server response time increases Time to First Byte (TTFB), delays initial page rendering, and degrades Core Web Vitals (LCP).',
      confidence: 'high',
      recommendedFix: 'Implement edge caching (Cloudflare, Vercel Edge, CDN), optimize server queries, or use static generation (SSG) for high-traffic routes.',
      effort: 'moderate',
      validationInstructions: 'Measure TTFB using WebPageTest or Chrome DevTools Network panel.',
    });
  }

  if (uncompressedPages.length > 0) {
    findings.push({
      id: 'PERF_NO_COMPRESSION',
      category: 'performance',
      severity: 'high',
      title: `${uncompressedPages.length} HTML Page(s) Served Without Modern Compression`,
      evidence: `Uncompressed HTML responses detected on: ${uncompressedPages.slice(0, 3).join(', ')}`,
      affectedUrl: uncompressedPages[0],
      affectedUrls: uncompressedPages,
      whyItMatters: 'Uncompressed text assets increase transfer payloads by 60–80%, significantly slowing mobile download times.',
      confidence: 'high',
      recommendedFix: 'Enable Brotli (`br`) and Gzip (`gzip`) compression at the web server or CDN reverse proxy.',
      effort: 'quick_win',
      validationInstructions: 'Inspect response headers in DevTools and confirm `content-encoding: br` or `gzip`.',
    });
  }

  if (heavyHtmlPages.length > 0) {
    const affected = heavyHtmlPages.map((h) => h.url);
    const worst = heavyHtmlPages.sort((a, b) => b.bytes - a.bytes)[0];
    findings.push({
      id: 'PERF_EXCESSIVE_HTML_PAYLOAD',
      category: 'performance',
      severity: worst.bytes > 500 * 1024 ? 'high' : 'medium',
      title: `${heavyHtmlPages.length} Page(s) Exceed 250KB Initial HTML Payload`,
      evidence: `Largest HTML payload: ${worst.url} (${Math.round(worst.bytes / 1024)} KB).`,
      affectedUrl: worst.url,
      affectedUrls: affected,
      whyItMatters: 'Bloated HTML documents (frequently caused by giant inline JSON hydration payloads or inline SVG/scripts) delay DOM parsing and increase mobile memory footprint.',
      confidence: 'high',
      recommendedFix: 'Trim inline hydration state, paginate catalog lists, and move heavy SVGs or scripts to external cached files.',
      effort: 'moderate',
      validationInstructions: 'Check transfer size of initial document in Chrome DevTools.',
    });
  }

  if (largeDomPages.length > 0) {
    const affected = largeDomPages.map((p) => p.url);
    const worst = largeDomPages.sort((a, b) => b.domElements - a.domElements)[0];
    findings.push({
      id: 'PERF_EXCESSIVE_DOM_SIZE',
      category: 'performance',
      severity: 'medium',
      title: `${largeDomPages.length} Page(s) Have Excessive DOM Tree Size (> 1,500 Nodes)`,
      evidence: `Worst page: ${worst.url} contains ${worst.domElements} DOM elements (Google recommended threshold: < 1,500).`,
      affectedUrl: worst.url,
      affectedUrls: affected,
      whyItMatters: 'A large DOM tree increases memory usage, causes style recalculation delays, and hurts Interaction to Next Paint (INP).',
      confidence: 'high',
      recommendedFix: 'Simplify component hierarchies, virtualize long lists, and remove unnecessary wrapper elements.',
      effort: 'moderate',
      validationInstructions: 'Run Chrome DevTools Lighthouse to inspect total DOM elements count.',
    });
  }

  if (renderBlockingPages.length > 0) {
    const affected = renderBlockingPages.map((p) => p.url);
    findings.push({
      id: 'PERF_RENDER_BLOCKING_RESOURCES',
      category: 'performance',
      severity: 'medium',
      title: `${renderBlockingPages.length} Page(s) Contain Critical Render-Blocking Scripts/Styles`,
      evidence: `Pages with > 5 render-blocking tags: ${affected.slice(0, 3).join(', ')}`,
      affectedUrl: affected[0],
      affectedUrls: affected,
      whyItMatters: 'Synchronous scripts and external CSS block browser rendering, delaying First Contentful Paint (FCP).',
      confidence: 'high',
      recommendedFix: 'Add `defer` or `async` attributes to non-critical scripts and preload critical CSS.',
      effort: 'quick_win',
      validationInstructions: 'Verify scripts use defer/async and critical CSS is inlined or preloaded.',
    });
  }

  return {
    summary: {
      crawlerAverageFetchMs: avgFetchMs,
      crawlerSlowestPageMs: slowestMs,
      crawlerSlowestUrl: slowestUrl,
      crawlerFastestPageMs: fastestMs === Number.MAX_SAFE_INTEGER ? 0 : fastestMs,
      largeDomCount,
      uncompressedPagesCount,
      excessiveHtmlSizeCount,
      highRenderBlockingCount,
      isFieldDataAvailable: false,
      fieldDataNotice:
        'Notice: Crawler fetch duration represents synthetic round-trip latency measured during the crawl. Real-user field Core Web Vitals (LCP, FID/INP, CLS) require 28-day Chrome User Experience Report (CrUX) data. SearchScope does not manufacture fake field CWV scores.',
    },
    findings,
  };
}
