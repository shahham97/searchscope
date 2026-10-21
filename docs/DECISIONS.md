# SearchScope Architecture & Engineering Decisions (DECISIONS.md)

This document records the architectural decisions, root cause analyses, trade-offs, and technical solutions implemented in SearchScope.

---

## 1. Root Cause Analysis: The `kingshyer.com` "HTTP Error / 0ms / 0 words" Bug

### Discovery & Reproduction
- **Observed Symptoms:** Auditing `https://kingshyer.com` returned all URLs with `statusCode: 0`, `duration: 0ms`, empty titles, 0 words, 0 schemas, and generic "HTTP Error".
- **Reproduction:** Created a deterministic crawl harness and captured the exact thrown exception.
- **Root Cause Identified:**
  `kingshyer.com` (apex domain) issues a 308 Permanent Redirect to `www.kingshyer.com`.
  In `safe-fetch.ts`, the redirect destination validation checked:
  ```ts
  const isExactMatch = current === allowed;
  const isSubdomain = options.allowSubdomains && current.endsWith(`.${allowed}`);
  if (!isExactMatch && !isSubdomain) {
    throw new Error(`Redirect left allowed domain scope: ${currentUrl} (base: ${allowed})`);
  }
  ```
  Because `allowedHostname` was `kingshyer.com` and `allowSubdomains` was `false`, `www.kingshyer.com` was classified as an illegal cross-domain jump! Furthermore, even if `allowSubdomains` were `true`, a user typing `www.example.com` redirecting to apex `example.com` would also fail because `example.com` does not end with `.www.example.com`.
  This exception was swallowed in the crawler and mapped to `statusCode: 0`, displaying in the UI as a generic "HTTP Error" before any network bytes or round-trip timings could be measured.

### Permanent Fix
1. **Canonical Host Equivalence (Apex <-> WWW & Same-Site Hops):**
   Implement `isSameSiteOrWwwEquivalence(currentHost, baseHost)` allowing `www` <-> apex transitions and http -> https transitions without considering them "cross-domain". If the root domain permanently redirects from apex to www (or vice-versa), update the crawl target's canonical origin so subsequent link discovery stays in-scope.
2. **Modern `undici` Fetch Client with Custom DNS Pinning & SNI Preservation:**
   Use `undici.Agent` with custom `connect.lookup` so that DNS safety validation pins safe IP addresses while TLS handshake properly retains the hostname in SNI (`servername`), avoiding SSL/TLS handshake failures.
3. **Realistic Browser User-Agent & Headers:**
   Default to a modern Chrome/Safari User-Agent with full `Accept`, `Accept-Language`, and decompression (`gzip`, `br`, `zstd`), plus a toggle for transparent `SearchScopeBot/1.0`.
4. **Typed Failure Taxonomy:**
   Replace generic "HTTP Error" with explicit error codes:
   - `DNS_FAILURE`
   - `TLS_ERROR`
   - `CONNECTION_REFUSED`
   - `TIMEOUT`
   - `SSRF_BLOCKED`
   - `ROBOTS_BLOCKED`
   - `WAF_CHALLENGE`
   - `HTTP_4XX`
   - `HTTP_5XX`
   - `REDIRECT_LOOP`
   - `CONTENT_TYPE_UNSUPPORTED`
   - `BODY_TOO_LARGE`
5. **Score Protection for Failed Crawls:**
   Never compute or display an audit score from failed crawls. If the successful page ratio falls below threshold, render a clear "Crawl Failed / Diagnostics" view.
6. **Self-Test Diagnostic Endpoint:**
   Create `/api/selftest` to test `https://example.com`, `https://kingshyer.com`, and a known site with per-stage timing diagnostics.

---

## 2. Serverless Batch Crawling Architecture

### The Problem
Vercel serverless functions have strict execution limits (Hobby plan: max duration 10–60s depending on config). Running a BFS crawl of 25–100 pages in a single API request risks timeouts, memory exhaustion, or network disconnects.

### The Solution
Implement **client-orchestrated batch crawling**:
1. Client initializes an audit by calling `/api/audit/init` (or crawler dispatch), resolving canonical host, checking `robots.txt`, discovering sitemaps, and extracting seed URLs.
2. Client queries `/api/audit/batch` in small batches (e.g. 3–5 URLs per call), streaming or returning JSON with `maxDuration: 60`.
3. Client maintains state in memory, updates live progress counters, supports instant pause/cancel, and combines page results into the master report.
4. Client executes the analyzers and scoring client-side or on completed batches, ensuring zero database requirement and zero server timeout risk.

---

## 3. Tiered Fetching Architecture

- **Tier 1: Fast HTTP with `undici`**: Full decompression (`gzip`, `brotli`, `zstd`), browser-grade headers, retry with exponential backoff on 429/503/504 (honoring `Retry-After`).
- **Tier 2: Headless Rendering (`playwright-core` / `@sparticuz/chromium`)**: Detects SPA shells (`<div id="root">`, `__next` with sparse text) or client-side rendering. Compares raw HTML vs. rendered HTML to flag "Content depends on JavaScript".
- **Tier 3 (Optional, Env-Gated)**: External fetch provider hooks (`SCRAPER_API_KEY`, `BROWSERLESS_URL`) if configured, while preserving zero-cost default.

---

## 4. Deliverables & Export Center

SearchScope exports 7 comprehensive deliverables:
1. `searchscope-[domain]-audit-[date].pdf`: Multi-page executive PDF report.
2. Comprehensive CSVs: `findings.csv`, `urls.csv`, `keywords.csv`, `links.csv`, `redirects.csv`, `images.csv`, `structured-data.csv`.
3. `audit-full.json`: Full machine-readable audit state.
4. `report.html`: Self-contained offline HTML report.
5. `IMPROVEMENTS.md`: An actionable AI-agent task plan with exact code snippets (JSON-LD, meta tags, Next.js metadata) formatted for copy-pasting into Cursor, Claude Code, or Antigravity.
6. `ROADMAP.md`: 5-phase impact × effort action plan.
7. Auto-generated files in `/generated/`: Corrected `robots.txt`, `sitemap.xml`, `llms.txt`, and page-level JSON-LD snippets.
8. **Download Everything (ZIP)**: Assembled client-side using `jszip`.
