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

---

## 5. Root Cause Analysis: Duplicate React Keys (`GEO-ENTITY-CLARITY-...`)

### Discovery
Running an audit on `https://kingshyer.com` triggered console errors:
`Encountered two children with the same key, 'GEO-ENTITY-CLARITY-https://www.kingshyer.com/product/midas-reserve'`.

### Root Cause
1. During link extraction, both apex links (`https://kingshyer.com/product/...`) and www links (`https://www.kingshyer.com/product/...`) were enqueued.
2. When fetched, redirect resolution normalized them both to `https://www.kingshyer.com/product/...`.
3. Both responses were pushed into `pages`, creating two pages with the same `normalizedUrl`.
4. The GEO entity clarity analyzer generated findings per page, producing two findings with identical `id` (`GEO-ENTITY-CLARITY-https://www.kingshyer.com/...`).

### Fix
1. In `src/lib/crawler/crawler.ts`: Added `visitedNormalizedPages` tracking across redirects to ensure a normalized URL is never recorded twice.
2. In `src/lib/audit-runner.ts`: Deduplicated `allFindings` using a `Map<string, Finding>`.
3. In `src/components/CategoryFindings.tsx`: Used compound unique keys: ``key={`${finding.id}-${idx}`}``.

---

## 7. Heading Extraction & False-Positive Elimination

### Problem
Auditing live product pages (e.g. `https://www.kingshyer.com/product/velvet-amber`) showed "Document contains zero `<h1>` elements" despite the presence of `<h1 class="font-display text-3xl md:text-4xl">Velvet Amber</h1>` in raw HTML.

### Root Cause
1. In `src/lib/extractor/headless-renderer.ts`, boilerplate elements (`<header>`, `<nav>`, `<aside>`, `<footer>`) were stripped *before* heading extraction was performed to compute raw vs rendered diffs. On modern e-commerce sites (including Next.js and Tailwind stores), product titles frequently reside inside a `<header>` tag within `<article>` or `<main>`.
2. Headings, metadata, links, and structured data must always be extracted from the full, unstripped DOM. Boilerplate stripping must only apply to body readability, text snippets, and word counting.

### Fix
- Heading extraction in `src/lib/extractor/html-parser.ts` and `headless-renderer.ts` runs on the complete DOM prior to any tag stripping.
- Extracted headings distinguish between raw server HTML (`rawH1s`) and rendered DOM (`renderedH1s`). If H1 is present in raw HTML, it passes; if H1 only appears after JavaScript rendering, it logs a Medium severity finding with DOM evidence.
- Added heuristics for carousel/slider-bound H1s on homepages (`aria-roledescription="carousel"`, `.swiper-slide`, `.carousel-item`), recommending stable category/brand H1s.
- Checks for empty H1s, hidden H1s (`display: none`, `visibility: hidden`), and heading hierarchy skips (H1 -> H3).

---

## 8. Canonical & Host Consistency Analyzer

### Problem
KingShyer scored 100/100 on canonicals despite a live conflict: the live site served on `https://www.kingshyer.com/`, but `<link rel="canonical">`, `og:url`, and `og:image` specified `https://kingshyer.com/...` (apex), which in turn issued a 308 redirect back to `www.kingshyer.com`.

### Solution
Created a dedicated `src/lib/analyzer/canonical.ts` engine:
1. Compares served final URL host against canonical URL host.
2. Detects apex <-> www circular redirect loops where canonical points to a host that redirects back to the current page.
3. Detects relative canonical URLs, multiple canonical elements, and canonicals placed outside `<head>`.
4. Compares canonical host against XML sitemap `<loc>` host.
5. Verifies `og:url` and `og:image` domain alignment with canonical.
6. Generates platform-native code snippets:
   - For Next.js App Router: `export const metadata = { metadataBase: new URL('https://www.kingshyer.com'), alternates: { canonical: './' } };`
   - For generic HTML: `<link rel="canonical" href="https://www.kingshyer.com/..." />`

---

## 9. Advanced Quality & Heuristic Engines

### Heuristics Implemented
1. **Image Alt Quality (`image-quality.ts`):**
   - Flags alts that are filenames (`30ml.jpg`), UUIDs, single characters (`2`), or generic placeholders (`image`).
   - Detects duplicate alt text across distinct product images and proposes contextual alt text derived from page H1.
2. **Text Quality & Typo Detector (`typo-detector.ts`):**
   - Scans headings, titles, and link text with an automatic allowlist built from brand names, schemas, and domain tokens.
   - Detects sitewide navigation typos (e.g. `"Car Freshners"` -> `"Car Fresheners"`).
3. **Faceted Parameter URLs & Metadata Fallbacks (`faceted-urls.ts`):**
   - Flags faceted parameters (`?sub=men`) competing with canonical parents.
   - Detects when product or category pages inherit the exact homepage title or description due to missing page metadata.
4. **Content Similarity & Shingling (`similarity.ts`):**
   - Uses 3-gram shingling and Jaccard similarity across product pages after stripping product names, flagging template overlap $\ge 75\%$.
5. **Ambiguous Links & Anchor Text (`weak-links.ts`):**
   - Flags identical anchor text pointing to different destinations (e.g. multiple "Men" cards).
6. **Schema DOM Parity (`schema-parity.ts`):**
   - Validates that `FAQPage` questions exist in visible body text.
   - Verifies that `Product` `aggregateRating` matches visible review indicators.
7. **Social Metadata Completeness (`social-metadata.ts`):**
   - Flags `og:type` mismatches, missing `og:image:width`/`height`/`alt`, and images below recommended dimensions ($1200 \times 630$).

---

## 10. Compliance & Claim-Risk Detector

### Approach
Rather than judging commercial claims as definitively true or false, SearchScope flags statements that require business owner verification under consumer protection guidelines (e.g. ACCC Country of Origin Guidelines, FTC endorsement standards):
1. **Origin / Making Claims:** "Australian-made", "handcrafted in Canberra", "hand-poured" (High severity if unverified).
2. **Ingredient & Purity Claims:** "100% pure", "organic", "cruelty-free" (Medium severity).
3. **Performance & Health Claims:** "lasts 14 hours", "zero redness", specific concentration % (High severity).
4. **Superlatives & Comparative Claims:** "world's best", "#1 in Australia" (Medium severity).
5. **Trademark-Adjacent Naming:** Fragrance inspirations adjacent to recognized third-party marks ("Baccarat Rouge", "Santal 33") (Advisory severity).
6. **Customer Review Integrity Baseline:** Explicit warning that reviews from store owners, employees, contractors, friends, or family must never be presented as customer reviews.

---

## 11. Page-Type Classification & Calibrated Scoring

### Page-Type Classification
`classifyPageType()` categorizes pages into `home`, `collection`, `product`, `article`, `about`, `contact`, `policy`, and `utility`.
- Product: 300+ words recommended. Under 150 = High severity; 150–300 = Medium severity ("Moderate content depth").
- Article: 800+ words recommended. Under 400 = High severity.
- Collection: 100–250 words is standard; not flagged as thin if catalog has $\ge 4$ products. Under 100 words = Low severity intro copy gap.
- Policy/Contact/Utility: Legitimately concise and exempt from thin content rules.

### Recalibrated Scoring Formula
$$Score = 100 - \sum_{rule} \min\left(rule\_cap, base\_penalty \times (0.35 + 0.65 \times affected\_ratio)\right)$$
- Grouping findings by rule family ensures systemic issues (e.g. missing H1 across 50 pages) are smoothly capped at 25 points, preventing a single issue from zeroing an entire category.
- If 0 pages crawl or crawl fails: returns score 0 with `incomplete` status and `low` confidence.
- Sum of category findings count strictly equals `findings.length`.
- Reports crawl coverage sample percentage (e.g. "54 of 97 pages crawled (56% sample)").

---

## 12. Crawl Accounting Balance, Ultra-Detailed PDF & Brand Facts Layer

### Crawl Accounting Balance Invariant
Every discovered URL is accounted for in one and only one bucket:
$$\text{discovered} = \text{crawled\_ok} + \text{failed} + \text{skipped\_robots} + \text{skipped\_non\_html} + \text{not\_crawled\_limit}$$
The UI and report provide a dedicated "Not Crawled (Limit Reached)" tab listing all uncrawled URLs.
User-Agent transparency: `SearchScope-Auditor/1.0 (+https://searchscope.app/bot)` with a working `/bot` documentation route detailing politeness, IP ranges, and robots.txt blocking directives.

### Vector PDF Engine (`pdf-generator.ts`)
Comprehensive, multi-page vector PDF containing:
1. Executive Scorecard & Crawl Accounting Balance
2. Prioritized 5-Phase Action Roadmap with full code snippets
3. Detailed Findings Matrix with **FULL un-truncated URLs** (wrapped cleanly with `linebreak`)
4. What Passed / Verified Healthy Architecture
5. Compliance & Claim-Risk Verification Checklist (`[ ]` checkable boxes)
6. Candidate Keywords & Search Intent Matrix with per-page frequency counts
7. Full Technical URL Inventory
8. Diagnostics, Methodology & Limitations Appendix

### Brand Facts Architecture (`brand-facts.ts`)
- Implements `BrandFacts` data model (`countryOfOrigin`, `productClaims`, `reviewPolicy`, `prohibitedClaims`).
- Automatically seeds candidate facts from crawl data with `isOriginVerified: false`.
- Built interactive `BrandFactsModal` with JSON import/export and form editing.
- Validates proposed copy against brand facts; unverified claims generate `FACTS_NEEDED.md` questionnaire for the owner.


---

## 6. SearchScope Autonomous AI Agent Mode (BYOK)

### Architectural Decisions
1. **Zero Database / Transient Memory:**
   API keys and session parameters are kept exclusively in client-side React memory. The `/api/agent/proxy` endpoint functions strictly as a transient conduit to prevent CORS issues without persisting anything to disk or databases.
2. **Deterministic & Mock Testing:**
   A deterministic `MockProvider` was engineered to enable 100% offline, zero-cost unit testing in Vitest, allowing CI/CD to verify all 5 stages of the agent pipeline without hitting external APIs.
3. **Strict Zero-Hallucination Guardrails:**
   All content generation is restricted to crawled page facts. Any unverified specification, ingredient, pricing, or warranty is systematically enveloped in `[[CONFIRM: ...]]` placeholders and flagged for human sign-off in the Owner Confirmation Checklist.
4. **Platform Footprint Detection & Code Patching:**
   The agent detects whether the target site runs Next.js (App Router or Pages Router), Shopify, WordPress, Webflow, etc., and provides platform-native implementation guidance with exact file paths (`app/product/[slug]/page.tsx`), Next.js `generateMetadata()` snippets, and unified diffs.
5. **Multi-Format Deliverables:**
   Outputs include `UPDATE_PLAN.md`, `AGENT_TASKS.md`, `update-plan.json` (schema-validated), `update-plan.csv`, and client-side ZIP packaging via `JSZip`.

---

## 7. SearchScope v3: Part A — Data Integrity & Result Ledger Architecture

### Root Cause Analysis: The "342 URLs crawled, only 31 shown" Defect
1. **Monolithic Serverless Execution & Simulated Client Ticks:**
   - The crawl runner attempted to process all discovered URLs inside a single 50-second serverless execution window. With politeness delays (150ms) plus TLS, HTTP round trips, and DOM parsing, the engine could only finish ~31 pages before exhausting its time budget.
   - The frontend ran an artificial `setInterval` ticker (`progressInterval`) that blindly assumed progress up to `maxPages`, creating a severe divergence between simulated progress counters and actual collected results.
   - Responses containing heavy raw HTML strings threatened Vercel's ~4.5 MB response payload limit.

### Core Architectural Fixes
1. **Result Ledger (`src/lib/crawler/ledger.ts`):**
   - Single source of truth for all URLs throughout the audit lifecycle.
   - Every discovered URL has exactly one terminal state: `crawled_ok`, `failed(code, hint)`, `skipped_robots`, `skipped_non_html`, `not_crawled_limit`, `redirected(target)`.
   - Strictly enforces five mathematical invariants:
     - Invariant 1: `discovered = crawled_ok + failed + skipped_robots + skipped_non_html + not_crawled_limit + redirected`.
     - Invariant 2: Rows in URL Explorer "All" view strictly equal `discovered`; rows in "Successful" view strictly equal `crawled_ok`.
     - Invariant 3: Total pages analyzed across every rule engine strictly equals `crawled_ok`.
     - Invariant 4: `urls.csv` and PDF technical inventory match the ledger `discovered` count exactly.
     - Invariant 5: Sum of category findings strictly equals total audit findings.
2. **Chunked Batch Crawling (`/api/audit/init`, `/api/audit/batch`, `/api/audit/analyze`):**
   - Client orchestrator dispatches bounded chunks ($\le 5$ URLs per batch).
   - Server returns parsed structured data without `rawHtml`, keeping batch payloads $< 1$ MB and execution time $< 15$s.
   - Automatic exponential retry (up to 3 attempts); if a batch ultimately fails, its URLs are recorded as `failed('BATCH_LOST')` in the ledger—never silently dropped.
3. **Stratified Sampling (`src/lib/crawler/stratified-sampler.ts`):**
   - When discovered URLs exceed crawl capacity limits, stratified sampling replaces arbitrary BFS cutoff.
   - Guarantees fair representation across page types (`home`, `collection`, `product`, `article`, `about`, `contact`, `policy`, `utility`) and click depths (depths 0, 1, 2, 3+).
   - Generates transparent distribution summaries for URL Explorer and reports.
4. **Stress Testing:**
   - Comprehensive 500-URL stress tests in `tests/crawler-ledger.test.ts` verifying 100% accounting balance and zero URL loss under normal, 404, 500, redirect, timeout, and robots-blocked conditions.


