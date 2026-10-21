# SearchScope Architecture Guide (ARCHITECTURE.md)

## 1. System Overview

SearchScope is an autonomous, serverless website search intelligence and technical audit platform built with Next.js (App Router), TypeScript, Tailwind CSS, and `undici`. It runs on Vercel without databases, persistent caches, or paid AI APIs.

```
                          Client (Browser)
    ┌────────────────────────────────────────────────────────┐
    │  • Audit Configuration & Live Crawl Progress State     │
    │  • Filterable Findings, Roadmap & DOM Inspector        │
    │  • Client-Side Vector PDF Generator (jsPDF)            │
    │  • Export Center: ZIP Compilation (JSZip)              │
    └──────────────────────────┬─────────────────────────────┘
                               │ HTTPS (POST /api/audit, GET /api/selftest)
                               ▼
                        Serverless API Layer
    ┌────────────────────────────────────────────────────────┐
    │  • Zod Input Validation & Per-IP Rate Limiting         │
    │  • SSRF & Rebinding Guard (Private IP/Metadata block)  │
    │  • Undici Fetch Engine (DNS Pinning & SNI Preservation)│
    │  • robots.txt, XML Sitemaps, and BFS Crawler           │
    │  • Deterministic Rules & TF-IDF Keyword Extraction     │
    └────────────────────────────────────────────────────────┘
```

---

## 2. Network & SSRF Security Defense

### Strict Address Filtering
Before connecting to any URL, SearchScope inspects both IPv4 (`A`) and IPv6 (`AAAA`) DNS records:
- **Loopback:** `127.0.0.0/8`, `::1`
- **Private RFC1918:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Cloud Metadata:** `169.254.169.254`, `metadata.google`
- **Link-Local:** `169.254.0.0/16`
- **Carrier-Grade NAT:** `100.64.0.0/10`
- **Ports Allowed:** Standard web ports (`80`, `443`, `8080`, `8443`)

### DNS Pinning & SNI Preservation
SearchScope configures `undici.Agent` with a custom `connect.lookup` override. The resolved IP is verified against SSRF rules at connection time, while the TLS handshake continues using the virtual host's domain in Server Name Indication (`servername`), avoiding SSL handshake failures.

### Hop-by-Hop Redirect Re-Validation
On HTTP redirects (`301`, `302`, `307`, `308`), each subsequent hop destination is independently validated. SearchScope permits same-site transitions (such as `http` -> `https` and apex <-> `www` hops) while preventing cross-domain redirect escaping.

---

## 3. Failure Taxonomy

SearchScope replaces ambiguous errors with a typed failure taxonomy:
- `DNS_FAILURE`: Domain name could not be resolved.
- `TLS_ERROR`: Certificate or handshake mismatch.
- `CONNECTION_REFUSED`: Destination port rejected TCP connection.
- `TIMEOUT`: Target server exceeded request timeout budget.
- `SSRF_BLOCKED`: Request targeted a private or reserved IP address.
- `ROBOTS_BLOCKED`: URL explicitly disallowed in robots.txt.
- `WAF_CHALLENGE`: Access restricted by Cloudflare, Turnstile, or Vercel Attack Challenge.
- `HTTP_4XX`: Client status error (400, 401, 403, 404, 410, 429).
- `HTTP_5XX`: Server status error (500, 502, 503, 504).
- `REDIRECT_LOOP`: Exceeded maximum redirect depth of 10 hops.
- `CONTENT_TYPE_UNSUPPORTED`: Resource is an image, PDF, or binary stream.
- `BODY_TOO_LARGE`: Response payload exceeded 5 MB cap.

---

## 4. Analysis Engines

### 1. Technical SEO
Evaluates indexability, status codes, canonical tag format and consistency, mixed content, robots directives, soft-404 signatures, and mobile viewport tags.

### 2. On-Page SEO
Evaluates title and description length (including pixel width estimation), single primary H1 tags, heading levels, image `alt` text, image dimensions (CLS prevention), and language attributes.

### 3. Structured Data
Validates Schema.org JSON-LD blocks for `Organization`, `WebSite`, `Product`, `Article`, `BreadcrumbList`, and `FAQPage`. E-commerce products are validated for `offers`, `price`, and `availability`.

### 4. AEO (Answer Engine Optimization)
Checks for conversational question headings, direct answer opening definitions, structured comparison tables (`<table>`), and sequential lists (`<ul>`, `<ol>`).

### 5. GEO (Generative Engine Optimization)
Validates `/llms.txt` presence and structure, audits AI bot crawler permissions across 10 major crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.), and checks semantic landmark elements.

### 6. Search Intelligence & Keywords
Extracts 1-gram, 2-gram, and 3-gram candidate terms using TF-IDF across the crawled document set. Classifies search intent (Informational, Commercial, Transactional, Navigational, Local) and identifies **keyword gaps** (terms present in body text but omitted from `<title>` and `<h1>`).

---

## 5. Export Center & Deliverables

SearchScope generates 7 deliverables assembled in client browser memory:
1. `searchscope-[domain]-audit-[date].pdf`: Vector PDF with executive summary, scorecard, findings, and roadmap.
2. `IMPROVEMENTS.md`: Action plan formatted with copy-paste code patches for AI coding agents.
3. `ROADMAP.md`: 5-phase engineering roadmap ordered by impact × effort.
4. `audit-full.json`: Full machine-readable audit state.
5. `report.html`: Self-contained standalone offline HTML report.
6. 7 Tabular CSVs (`findings.csv`, `urls.csv`, `keywords.csv`, `links.csv`, `redirects.csv`, `images.csv`, `structured-data.csv`).
7. Auto-generated configuration files (`robots.txt`, `sitemap.xml`, `llms.txt`, `jsonld-snippets.json`).
8. `Download Everything (ZIP)`: Compiled using `JSZip` without server file storage.
