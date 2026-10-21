# SearchScope

> **Production-Grade Website SEO, AEO, GEO & Search Intelligence Auditor**

SearchScope is an independent, privacy-conscious search intelligence and technical audit platform built with Next.js, TypeScript, and Tailwind CSS. It is architected for deployment on Vercel without databases, persistent storage, paid SEO subscriptions, or third-party AI API keys.

---

## 1. Core Capabilities & Audit Modules

### Technical SEO & Crawlability
- **HTTP Response Codes:** Detection of 4xx client errors, 5xx server exceptions, and redirect chains.
- **Protocol Security:** HTTPS enforcement, mixed content detection, and insecure HTTP warnings.
- **Robots.txt & Sitemap Discovery:** Automated discovery and safe XML parsing of standard sitemaps and sitemap indexes; compliance verification against disallow/allow rules.
- **Canonical Consistency:** Absolute vs. relative canonical evaluation, missing canonical tags, self-referencing integrity.
- **Soft-404 Candidate Detection:** Evaluates page content and headers to spot 200 OK responses with missing-content titles and body text.
- **Broken Internal Links:** Validates all crawled internal hyperlink destinations.

### On-Page SEO
- **Title Tags:** Length bounds (recommended 50–60 chars, flagged <25 or >65 chars), missing titles, duplicate titles across crawled pages.
- **Meta Descriptions:** Length bounds (120–155 chars), missing descriptions, duplicate descriptions across pages.
- **Heading Architecture:** Primary H1 enforcement, multiple H1 warnings, skipped heading level detection (e.g. H1 followed directly by H3 without H2).
- **Image Optimization & Accessibility:** Missing or empty image `alt` attributes, image dimension checks (`width` and `height`) to prevent Cumulative Layout Shift (CLS).
- **Internationalization & Social Meta:** `<html lang="...">` verification, Open Graph (`og:title`, `og:image`, `og:description`) audit.

### Structured Data (Schema.org JSON-LD)
- **Safe Parsing:** Native JSON-LD extraction and syntax validation.
- **Entity Identification:** Validates `@context`, `@type`, and recommended attributes for:
  - `Organization`
  - `WebSite`
  - `BreadcrumbList`
  - `Article` & `BlogPosting`
  - `Product` & `Offer`
  - `FAQPage`
  - `LocalBusiness`
- **Homepage Brand Entity:** Flags missing Organization or WebSite schema on the root homepage.

### Answer Engine Optimization (AEO)
- **Conversational Subheadings:** Detects whether subheadings (H2/H3) are framed as natural user questions ("What", "How", "Why").
- **Direct Definitions:** Analyzes opening copy for concise, definitional statements suitable for Google AI Overviews and answer engine direct extracts.
- **Structured Data Formats:** Inspects pages for HTML tables (`<table>`) and sequential lists (`<ul>`, `<ol>`) prioritized by answer engines.
- **FAQ Sections:** Evaluates presence of structured Q&A content and Schema.org `FAQPage` markup.

### Generative Engine Optimization (GEO)
- **`llms.txt` Standard Inspection:** Evaluates whether an `/llms.txt` file is published at the domain root (with clear caveats that this is an emerging proposal, not a mandatory Google ranking requirement).
- **Semantic HTML & Landmark Structure:** Validates semantic document hierarchy for LLM crawler parsing.
- **Entity Consistency:** Assesses whether visible entity names align with Schema.org JSON-LD definitions.
- **Attribution & Transparency:** Flags long-form content lacking author bylines or institutional credentials.

### Search Intelligence & Candidate Keywords
- **N-Gram Structural Extraction:** Extracts 1-gram, 2-gram, and 3-gram candidate terms from `<title>`, headings, and body copy.
- **Intent Classification:** Categorizes candidates into Informational, Commercial, Transactional, Navigational, and Local search intents.
- **Zero Fabricated Metrics:** Explicitly avoids fabricating artificial search volume, CPC, or ranking difficulty numbers.
- **Data Provenance:** Discloses data origin and marks unconfigured live SERP scrapers truthfully as `unavailable`.

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
3. **DNS Rebinding & Redirect Defense:** Re-validates destination IP and hostname on each redirect hop before issuing HTTP requests. Cross-domain redirects are rejected.
4. **Safe Parsers:** HTML and XML parsers disable external entity processing (XXE safe).
5. **Bounded Resource Ceiling:** Request timeouts (8s), per-page byte limits (2.5MB), and maximum execution budget (45s) prevent serverless function hangs and memory bloat.

---

## 3. Privacy & Ephemeral State Model

- **No Database:** No Postgres, MySQL, TiDB, Redis, or MongoDB.
- **No User Accounts:** No sign-up, login, cookies, or session tracking.
- **Browser-Only Active Memory:** Audit results exist only in browser memory and transient execution state. Refreshing or closing the tab completely clears all audit data.
- **No Third-Party AI Data Transmission:** Crawled page contents are never sent to OpenAI, Anthropic, or external inference APIs.
- **Infrastructure Logging Disclosure:** Standard operational access logs (IP addresses, timestamps, request URLs) may be retained by hosting providers (Vercel) and the target website's own servers according to their respective logging policies.

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
npm run test
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run start
```

---

## 5. Vercel Deployment Instructions

SearchScope is optimized for the **Vercel Hobby** and **Pro** tiers with zero external database configuration:

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel Dashboard, click **Add New Project** and select the SearchScope repository.
3. Configure settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
   - **Node.js Version:** 18.x or 20.x
4. **Environment Variables:** None required! The application is fully deterministic and operates with zero API keys or external database URLs.
5. Click **Deploy**.

---

## 6. PDF Report Generation

SearchScope generates professional, client-ready vector PDF audit reports directly in the client browser using `jspdf` and `jspdf-autotable`:

- **Cover Page:** Domain title, audit timestamp, overall score, crawler user agent.
- **Executive Summary:** Dimension scores, weight distribution, critical/high/medium/low issue counts.
- **Prioritized Roadmap:** Action items ordered by impact and effort, including copy-ready HTML and JSON-LD snippets.
- **Findings Table:** Full evidence breakdown, affected URLs, and verification instructions.
- **URL Explorer:** Crawled URLs, response codes, word counts, response times, and schema counts.
- **Candidate Keywords:** Structural n-gram terms categorized by search intent.
- **Methodology & Limitations:** Transparent disclaimers and privacy architecture.
- **Sanitized Filename:** E.g., `searchscope-example_com-audit-2026-10-21.pdf`.
