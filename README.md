# SearchScope v3

> **Production-Grade Website SEO, AEO, GEO & Search Intelligence Auditor**

SearchScope is an independent, privacy-conscious search intelligence and technical audit platform built with Next.js 15, TypeScript, and Tailwind CSS. It is architected for deployment on Vercel without databases, persistent storage, paid SEO subscriptions, or third-party AI API keys.

---

## 1. Core Architecture & Capabilities

### Data Integrity & Result Ledger (Part A)
- **Result Ledger Single Source of Truth:** Tracks every discovered URL through exact terminal states (`crawled_ok`, `failed(code, hint)`, `skipped_robots`, `skipped_non_html`, `not_crawled_limit`, `redirected`).
- **Accounting Balance Invariant:** Mathematically guarantees `discovered = crawled_ok + failed + skipped_robots + skipped_non_html + not_crawled_limit + redirected`.
- **Chunked Batch Crawling:** Client-orchestrated serverless crawling ($\le 5$ URLs per batch, $<1$MB payload) with exponential backoff retry.
- **Stratified Candidate Sampling:** Representative sampling across 8 page types (`home`, `collection`, `product`, `article`, `about`, `contact`, `policy`, `utility`) and click depths 0, 1, 2, 3+ when queue exceeds limits.

### Calibrated Pass-Rate Scoring (Part B)
- **Axiomatic Scoring Model:** Evaluates compliance pass rates across 28 check families.
- **Monotonicity:** Formally guarantees adding finding $F$ never increases the score ($\text{Score}(P \cup \{F\}) \le \text{Score}(P)$).
- **Critical Blocker Severity Gates:** Any critical blocker caps category score $\le 40$.
- **Correlated Defect Grouping:** Systemic issues (e.g. missing H1 across 50 pages) are logarithmically damped to prevent a single defect from zeroing out an entire category.

### Phrase-First Search Intelligence (Part C)
- **2–5-Gram Phrase Extraction with NPMI Filter:** Retains meaningful multi-word phrases ("alcohol free perfume") while filtering uninformative single tokens.
- **Multi-Signal Intent Classification:** Classifies Informational, Commercial, Transactional, Navigational, and Local search intents with calibrated confidence and transparent reasoning.
- **Hierarchical Keyword Map:** Structures keywords by head entities and modifiers to reveal content gaps.
- **Keyword Cannibalization Matrix:** Identifies competing internal pages targeting identical queries and provides consolidation recommendations.
- **Search Demand Signals:** Integrates live Google Autocomplete search demand client-side and supports CSV volume imports.

### Deep Technical SEO (Part D)
- **Internal Link Graph & PageRank:** Computes 0–100 PageRank authority using power iteration, click depth distribution, orphan pages, and redirect loops.
- **Indexation Hygiene:** Audits XML sitemaps for non-200 URLs, redirects, noindex conflicts, out-of-stock product 404s, and faceted navigation crawl traps.
- **Mobile Parity & Viewport:** Validates responsive viewport meta tags, flags `user-scalable=no` accessibility violations, and detects H1 headings injected solely via client JavaScript.
- **E-Commerce & International:** Validates Google Merchant Center Product schema attributes (`price`, `availability`, `brand/gtin`), checks bidirectional hreflang tags and ISO 639-1 language codes.
- **64-bit SimHash Document Deduplication:** Uses 3-word shingles to cluster near-duplicate pages (Hamming distance $\le 7$ corresponding to $\ge 85\%$ textual overlap).
- **Truth in Performance:** Measures synthetic crawler round-trip fetch latency. Explicitly discloses that Real-User Core Web Vitals (CrUX LCP/FID/CLS) require 28-day field data and are never fabricated.

### Enterprise UI & Truth in Privacy (Part E)
- **Single Shared Layout:** Global `SiteHeader` and `SiteFooter` in Next.js App Router root layout.
- **Calm Neutral Design System:** Zero sparkles, wands, robots, magic, purple-pink gradients, or emojis.
- **Truth in Privacy Hero:** Authoritative disclosure of zero database storage, host edge logs, and offline deterministic heuristics.
- **Seamless Direct Contact:** Desktop Gmail compose new tab, mobile Gmail app deep linking with mailto fallback, and one-click copy with $\ge 44$px touch targets.

---

## 2. Security Architecture & Threat Model

SearchScope accepts user-provided domains and URLs. It implements a multi-layered defense to prevent Server-Side Request Forgery (SSRF) and resource exhaustion:

1. **Protocol & Port Whitelisting:** Accepts only `http:` and `https:`; permits only standard web ports (80 and 443).
2. **DNS Resolution & IP Range Validation:** Resolves both IPv4 (A) and IPv6 (AAAA) records and validates every returned IP address:
   - Blocks IPv4 loopback (`127.0.0.0/8`).
   - Blocks IPv6 loopback (`::1`, `::`).
   - Blocks private RFC1918 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Blocks link-local addresses (`169.254.0.0/16`).
   - Blocks Cloud Metadata endpoints (`169.254.169.254`, `metadata.google`).
   - Blocks IPv6-mapped IPv4 private addresses (`::ffff:127.0.0.1`).
   - Blocks carrier-grade NAT (`100.64.0.0/10`).
3. **DNS Rebinding & Redirect Defense:** Re-validates destination IP and hostname on each redirect hop with custom DNS pinning in `undici.Agent`. Apex $\leftrightarrow$ WWW equivalence allowed without breaking scope.
4. **Safe Parsers:** HTML and XML parsers disable external entity processing (XXE safe).
5. **Bounded Resource Ceiling:** Request timeouts (8s), per-page byte limits (10MB body ceiling), and batch timeouts prevent serverless function hangs and memory bloat.

---

## 3. Privacy & Zero-Persistence Model

- **No Database:** No Postgres, MySQL, TiDB, Redis, Supabase, or MongoDB.
- **No User Accounts:** No sign-up, login, cookies, or session tracking.
- **Browser-Only Active Memory:** Audit results exist only in browser memory and transient execution state. Refreshing or closing the tab completely clears all audit data.
- **No Third-Party AI Data Transmission:** Crawled page contents are never sent to external LLM APIs by default.
- **Infrastructure Logging Disclosure:** Standard operational access logs (IP addresses, timestamps, request URLs) are retained ephemerally by hosting providers (Vercel) for platform reliability.

---

## 4. Local Development

### Prerequisites
- Node.js >= 18.0.0 (Tested on Node.js 24)
- npm >= 9.0.0

### Installation
```bash
git clone https://github.com/your-org/searchscope.git
cd searchscope
npm install
```

### Running Tests
```bash
npm test
```
All 25 test suites (127+ tests) run completely offline without database or API dependencies.

### Production Build
```bash
npm run build
npm start
```
