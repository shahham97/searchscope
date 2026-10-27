# SearchScope Principled Pass-Rate Scoring Methodology (`SCORING.md`)

This document defines the mathematical models, formulas, check family hierarchies, severity gates, per-page health scoring, and calibration rationale powering the SearchScope audit engine.

---

## 1. Executive Summary & Philosophy

Traditional SEO audit tools employ arbitrary, uncalibrated deduction formulas: a fixed number of points (e.g. -15 or -35) are subtracted from 100 for every problem discovered. This creates severe distortion:
- **Score Collapse:** Correlated issues (e.g. Missing Title, Title Too Short, and Title Duplicate) deduct 3 separate times on the same page, driving scores into the ground on otherwise healthy websites.
- **Deceptive Perfection:** Sites with critical blockers (e.g. a site-wide `noindex` tag active in production or expired TLS) often score 85+ if all other on-page HTML tags are syntactically present.
- **Lack of Monotonicity:** Fixing a finding can unpredictably alter scores due to nonlinear penalty thresholds.

SearchScope replaces arbitrary deductions with a **Principled Pass-Rate Scoring Engine**:
1. Every category score is a weighted pass rate across distinct, orthogonal check families.
2. Correlated findings are unified under single check families so a page can never be penalized multiple times for correlated aspects of the same requirement.
3. Critical blockers trigger **Severity Gates** that cap overall scores regardless of other metrics.
4. Informational findings strictly have zero weight and never lower scores.
5. Every single URL receives a deterministic **Page Health Score (0–100)** enabling "worst pages first" prioritization.

---

## 2. Mathematical Scoring Formulas

### Category Score Formula
For any audit category $C$ with check families $F_1, F_2, \dots, F_k$:

$$\text{CategoryScore}(C) = \frac{\sum_{i=1}^k w_i \times \text{PassRate}(F_i)}{\sum_{i=1}^k w_i} \times 100$$

Where:
- $w_i$ is the configured check family importance weight ($2 \le w_i \le 5$).
- $\text{PassRate}(F_i)$ is defined as:
  - **For Page-Level Check Families:**
    $$\text{PassRate}(F_i) = \max\left(0, \frac{N_{\text{evaluated}} - N_{\text{failing}}}{N_{\text{evaluated}}}\right)$$
    Where $N_{\text{failing}}$ is the count of unique URLs failing that check family.
  - **For Site-Wide Checks (e.g. Robots.txt, /llms.txt, Homepage Status):**
    $$\text{PassRate}(F_i) = \begin{cases} 1.0 & \text{if passed} \\ 0.0 & \text{if failed} \end{cases}$$

### Correlated Deduction Capping
A check family aggregates multiple related rules. If a URL exhibits multiple related flaws (for example, missing H1, multiple H1s, and skipped H2 headings), the URL is recorded **at most once** as a failing page for the `onpage-headings` check family.

$$\text{FailingPages}(F_i) = \bigcup_{r \in \text{Rules}(F_i)} \text{AffectedUrls}(r)$$

### Severity Multiplier
When a check family fails with high or critical severity, its penalty weight is amplified:
- `critical`: multiplier $1.3\times$
- `high`: multiplier $1.1\times$
- `medium`: multiplier $1.0\times$
- `low`: multiplier $1.0\times$
- `informational`: multiplier $0.0\times$ (Zero deduction)

### Overall Score Formula
The overall website audit score is computed as a weighted average across all seven core categories:

$$\text{OverallScore} = \sum_{C \in \text{Categories}} W_C \times \text{CategoryScore}(C)$$

Where category weights $W_C$ sum to $1.00$:
- **Technical SEO:** 0.25
- **On-Page SEO:** 0.20
- **Content Quality:** 0.15
- **Structured Data:** 0.15
- **AEO Readiness:** 0.10
- **GEO Readiness:** 0.10
- **Technical Performance:** 0.05

---

## 3. Severity Gates

Regardless of high performance in other categories, critical blockers trigger **Severity Gates**:

1. **Site-Wide Blocker Gate:**
   - Triggered by: Site-wide `noindex` directive, homepage 500 error, DNS resolution failure, or expired TLS certificates.
   - **Enforcement:**
     $$\text{OverallScore} = \min(\text{OverallScore}, 40)$$
   - *Rationale:* A site that search engines are instructed not to index or cannot connect to cannot rank, regardless of schema or content quality.

2. **Critical Penalty Cap:**
   - Non-site-wide critical issues (e.g. multiple critical broken links or schema validation failures) are capped so that no single set of findings can deduct more than 35 points from the overall score.

---

## 4. Check Families Hierarchy

| Category | Family ID | Check Family Name | Weight | Scope | Correlated Rules Included |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Technical** | `tech-site-health` | Site Health, Robots & Sitemaps | 5 | Site-wide | `ROBOTS_TXT_DISALLOWED`, `SITEMAP_MISSING`, `DNS_FAILURE` |
| **Technical** | `tech-canonical` | Canonical Tag Integrity | 5 | Page-level | `CANONICAL_MISSING`, `CANONICAL_MISMATCH`, `CANONICAL_CONFLICT` |
| **Technical** | `tech-https-tls` | HTTPS & Protocol Security | 4 | Page-level | `MIXED_CONTENT`, `HTTP_REDIRECT_INSECURE`, `TLS_ERROR` |
| **Technical** | `tech-indexation` | Indexation & Crawl Directives | 4 | Page-level | `NOINDEX_ACCIDENTAL`, `X_ROBOTS_CONFLICT` |
| **Technical** | `tech-links-status` | Status Codes & Dead Links | 4 | Page-level | `BROKEN_INTERNAL_LINK`, `STATUS_404`, `STATUS_500` |
| **Technical** | `tech-mobile-viewport` | Mobile Viewport Configuration | 3 | Page-level | `VIEWPORT_MISSING`, `VIEWPORT_INVALID` |
| **On-Page** | `onpage-title` | Title Tag Quality & Length | 5 | Page-level | `TITLE_MISSING`, `TITLE_SHORT`, `TITLE_LONG`, `TITLE_DUPLICATE` |
| **On-Page** | `onpage-meta-description` | Meta Description Presence | 3 | Page-level | `DESCRIPTION_MISSING`, `DESCRIPTION_SHORT`, `DESCRIPTION_LONG` |
| **On-Page** | `onpage-headings` | Semantic Heading Hierarchy | 4 | Page-level | `H1_MISSING`, `H1_MULTIPLE`, `HEADING_LEVEL_SKIPPED` |
| **On-Page** | `onpage-images` | Image Alt Text Optimization | 3 | Page-level | `IMAGE_ALT_MISSING`, `IMAGE_ALT_GENERIC` |
| **On-Page** | `onpage-social-meta` | OpenGraph & Social Cards | 2 | Page-level | `OG_TITLE_MISSING`, `OG_IMAGE_MISSING`, `TWITTER_CARD_MISSING` |
| **Content** | `content-depth` | Content Substantiveness | 5 | Page-level | `WORD_COUNT_THIN`, `THIN_CONTENT`, `READABILITY_LOW` |
| **Content** | `content-uniqueness` | Content Uniqueness & Clusters | 4 | Page-level | `CONTENT_SIMILARITY_HIGH`, `DUPLICATE_CLUSTER` |
| **Content** | `content-orthography` | Text & Typographical Hygiene | 3 | Page-level | `TYPO_DENSITY_HIGH`, `MISSPELLING_COMMON` |
| **Content** | `content-claims-trust` | Trust, Editorial & About Proof | 3 | Page-level | `EAT_AUTHOR_MISSING`, `ABOUT_PAGE_MISSING`, `CLAIM_UNSUBSTANTIATED` |
| **Structured Data** | `sd-presence` | Schema JSON-LD Adoption | 5 | Page-level | `STRUCTURED_DATA_MISSING`, `SCHEMA_MISSING` |
| **Structured Data** | `sd-type-richness` | Rich Schema Entity Types | 4 | Page-level | `SCHEMA_TYPE_GENERIC`, `PRODUCT_SCHEMA_MISSING` |
| **Structured Data** | `sd-dom-parity` | Schema-DOM Parity | 4 | Page-level | `SCHEMA_DOM_PRICE_MISMATCH`, `SCHEMA_NAME_MISMATCH` |
| **Structured Data** | `sd-syntax-validity` | JSON-LD Syntax Validity | 4 | Page-level | `SCHEMA_SYNTAX_ERROR`, `SCHEMA_INVALID_PROPERTY` |
| **AEO** | `aeo-direct-definitions` | Direct Answer & Definitional Blocks | 5 | Page-level | `AEO_DEFINITION_ABSENT`, `DEFINITION_TOO_LONG` |
| **AEO** | `aeo-structured-lists` | Extraction Tables & Lists | 4 | Page-level | `AEO_TABLES_MISSING`, `AEO_LISTS_MISSING` |
| **AEO** | `aeo-faq-architecture` | Q&A Heading Architecture | 4 | Page-level | `AEO_FAQ_MISSING`, `QUESTION_HEADING_ABSENT` |
| **GEO** | `geo-discoverability` | Machine Discoverability (/llms.txt) | 4 | Site-wide | `GEO_LLMS_TXT_MISSING`, `GEO_DISCOVERABILITY_LOW` |
| **GEO** | `geo-entity-clarity` | Entity Grounding & Attributes | 4 | Page-level | `GEO_ENTITY_CLARITY_LOW`, `GEO_BRAND_AMBIGUOUS` |
| **GEO** | `geo-unambiguous-anchors` | Descriptive Internal Anchors | 3 | Page-level | `AMBIGUOUS_ANCHOR`, `WEAK_LINK` |
| **GEO** | `geo-factual-citations` | Factual Citation Grounding | 3 | Page-level | `GEO_CITATION_ABSENT`, `UNSUBSTANTIATED_CLAIM` |
| **Performance** | `perf-response-time` | Server Response Time (TTFB) | 4 | Page-level | `PERF_SLOW_RESPONSE_TIME` (TTFB > 800ms) |
| **Performance** | `perf-compression` | Asset Compression & Caching | 3 | Page-level | `PERF_NO_COMPRESSION`, `CACHE_HEADER_MISSING` |
| **Performance** | `perf-dom-lightweight` | Lightweight DOM & Assets | 3 | Page-level | `PERF_DOM_NODES_EXCESSIVE` (> 1500 nodes) |

---

## 5. Per-Page Health Score (0–100)

Every page in `report.pages` receives a deterministic `pageHealthScore` (0–100) computed by `calculatePageHealthScore(page, pageFindings)`:
- Pages start at a base score of `100`.
- Unreachable pages (`statusCode === 0` or $\ge 400$) score `0`.
- Deductions:
  - Missing title: `-15` (sub-optimal length: `-5`)
  - Missing H1: `-12` (multiple H1s: `-4`)
  - Missing meta description: `-8`
  - Thin body copy: `< 150` words (`-12`), `< 300` words (`-6`)
  - Missing Schema JSON-LD: `-10`
  - Missing canonical tag: `-6`
  - Missing image alt text: `-3` per image (capped at `-10`)
  - Slow server response: `> 1500ms` (`-8`), `> 800ms` (`-4`)
  - Page-specific findings: critical (`-15`), high (`-8`), medium (`-4`)
- Scored clamped to `[0, 100]`. URL Explorer displays this score as a colored badge and supports sorting by **Worst Health First**.

---

## 6. Calibration Corpus Rationale & 12 Archetypes

The scoring system is continuously calibrated against 12 reference site archetypes in `tests/calibration/fixtures.ts`:

1. **Well-Optimized Modern Site (Next.js):** [90–100]. Valid metadata, fast TTFB, Organization schema, /llms.txt.
2. **Average Ecommerce Store (Shopify):** [65–88]. Thin product descriptions, missing image alt text, missing AEO definitions.
3. **Content & Editorial Blog (WordPress):** [78–95]. Text-rich, Article schema, long titles, minor TTFB delays.
4. **JS-Heavy Client-Side SPA (CSR):** [38–68]. Empty static HTML shells, missing server-rendered metadata, missing static H1s.
5. **Broken Site with Critical Blocker:** [15–40]. Site-wide noindex or server 500 error. Enforced by Severity Gate $\le 40$.
6. **Thin Doorway Affiliate Site:** [35–75]. Thin copy (<100 words), no author attribution, missing schema, generic anchors.
7. **Local Service Business (Plumber / Dentist):** [72–96]. LocalBusiness schema, contact proofs, missing direct definitions.
8. **B2B Enterprise SaaS Platform:** [85–98]. SoftwareApplication schema, FAQ blocks, high readability, fast speed.
9. **Digital News Publisher:** [75–99]. NewsArticle schema, high editorial transparency, image-heavy TTFB.
10. **Educational / Government Site (.edu / .gov):** [65–92]. High text accessibility, missing modern Schema and social cards.
11. **Multilingual International Enterprise:** [80–98]. Clean hreflang tags, localized paths, solid schema.
12. **Creative Agency Visual Portfolio:** [50–82]. High imagery, minimal copy, missing alt text, missing definitions.

---

## 7. Mathematical Monotonicity Guarantee

SearchScope guarantees mathematical **monotonicity**:
For any set of findings $S$ and any finding $f \in S$:

$$\text{OverallScore}(S \setminus \{f\}) \ge \text{OverallScore}(S)$$
$$\forall C \in \text{Categories}: \quad \text{CategoryScore}_C(S \setminus \{f\}) \ge \text{CategoryScore}_C(S)$$

Fixing an issue will **strictly never lower** any score on the audit report. This property is automatically verified in CI by `tests/scoring-calibration.test.ts`.
