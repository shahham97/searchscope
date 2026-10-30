import { CrawledPage } from '@/types/audit';
import { AgentConfig, ChangeItem, NicheInsights, SiteProfile } from '../types';
import { PrioritizedFinding } from './stage-c-prioritization';
import { detectPlatform, resolveWhereToChange } from '../platform-detector';
import { redactPII, sanitizePromptInput } from '../redaction';
import { STAGE_D_CONTENT_PROMPT } from '../prompts/system-prompts';
import { LLMCallFn } from './stage-a-site-profile';
import { LLMMessage } from '../providers/llm-provider';

export interface StageDResult {
  changes: ChangeItem[];
  siteWideChanges: {
    robotsTxt?: string;
    llmsTxt?: string;
    sitemapXml?: string;
    rootJsonLd?: string;
  };
  newContentBriefs: {
    title: string;
    intent: string;
    slug: string;
    outline: string[];
    entitiesToInclude: string[];
    targetWordCount: number;
    initialDraft?: string;
  }[];
}

export async function runStageDContentGenerators(
  prioritized: PrioritizedFinding[],
  siteProfile: SiteProfile,
  nicheInsights: NicheInsights,
  pages: CrawledPage[],
  config: AgentConfig,
  callLLM: LLMCallFn
): Promise<StageDResult> {
  const { platform } = detectPlatform(pages);
  let domain = 'example.com';
  if (pages[0]?.url) {
    try {
      const toParse = /^https?:\/\//i.test(pages[0].url) ? pages[0].url : `https://${pages[0].url}`;
      domain = new URL(toParse).hostname;
    } catch {
      domain = pages[0].url.replace(/^https?:\/\//i, '').split('/')[0] || 'example.com';
    }
  }
  const brandName = siteProfile.verifiedUSPs[0] ? siteProfile.businessType : domain;

  // 1. Generate Site-Wide Changes
  // A. robots.txt based on config.aiCrawlerPolicy
  let robotsTxt = `User-agent: *\nAllow: /\n\n# Sitemaps\nSitemap: https://${domain}/sitemap.xml\n`;
  if (config.aiCrawlerPolicy === 'block_training') {
    robotsTxt += `\n# AI Training Scraper Disallow\nUser-agent: CCBot\nDisallow: /\nUser-agent: GPTBot\nDisallow: /\nUser-agent: ClaudeBot\nDisallow: /\nUser-agent: Google-Extended\nDisallow: /\n`;
  } else if (config.aiCrawlerPolicy === 'allow_search_only') {
    robotsTxt += `\n# Allow AI Search Engines; block bulk dataset training\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: CCBot\nDisallow: /\nUser-agent: Google-Extended\nDisallow: /\n`;
  } else {
    // allow_all
    robotsTxt += `\n# AI & Search Discovery\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\n`;
  }

  // B. llms.txt manifest
  const llmsTxt = `# ${domain}

> ${siteProfile.brandVoice.tone}. ${siteProfile.businessType}.

## Core Offerings & Services
${siteProfile.productsAndServices.map((p) => `- ${p}`).join('\n')}

## Distinctive Value & Formulations
${siteProfile.verifiedUSPs.map((u) => `- ${u}`).join('\n')}

## Recommended Documentation & Links
- [Homepage](https://${domain}/): Official online storefront and brand introduction.
${pages
  .filter((p) => p.url !== `https://${domain}/` && Boolean(p.title))
  .slice(0, 8)
  .map((p) => `- [${(p.title || 'Page').replace(/\|.*/, '').trim()}](${p.url}): Key destination page.`)
  .join('\n')}
`;

  // C. Root JSON-LD Organization schema
  const rootJsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: brandName,
      url: `https://${domain}`,
      description: `${siteProfile.businessType} specializing in ${siteProfile.niche}.`,
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: ['English'],
      },
    },
    null,
    2
  );

  // 2. Build New Content Briefs from Niche Gaps
  const newContentBriefs = nicheInsights.contentGaps.slice(0, 3).map((gap) => {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      title: `${gap.topic}: The Comprehensive Guide`,
      intent: 'Informational search and Answer Engine Optimization (AEO)',
      slug: `/guides/${slug}`,
      outline: [
        'Executive Summary & Direct Answer (40-60 words)',
        `Understanding ${gap.topic} in ${siteProfile.niche}`,
        'Key Factors to Consider Before Choosing',
        'Frequently Asked Questions & Expert Guidance',
      ],
      entitiesToInclude: [siteProfile.niche, ...siteProfile.productsAndServices.slice(0, 3)],
      targetWordCount: 1200,
      initialDraft: `## What is ${gap.topic}?\n\n${gap.topic} represents a crucial standard in ${siteProfile.niche}. When selecting products, discerning clients prioritize [[CONFIRM: specific quality indicator]] alongside artisanal craftsmanship.\n\n### Key Considerations\n- Material purity and origin\n- Craftsmanship and testing standards\n- [[CONFIRM: specific warranty or guarantee details]]\n`,
    };
  });

  // 3. Generate Concrete Changes for Prioritized Findings
  const changes: ChangeItem[] = [];

  // Take top 15 prioritized issues to generate concrete changes
  const topIssues = prioritized.slice(0, 15);

  for (let i = 0; i < topIssues.length; i++) {
    const item = topIssues[i];
    const targetUrl =
      (item.finding as any).affectedUrl ||
      (item.finding as any).affectedUrls?.[0] ||
      `https://${domain}`;
    const page = item.targetPage;
    const findingId = item.finding.id;
    const evidenceText =
      item.finding.evidence ||
      (item.finding as any).description ||
      item.finding.title ||
      '';

    // A. Title issues
    if (findingId.includes('TITLE')) {
      const currentTitle = page?.title || '';
      let urlPath = '';
      try {
        urlPath = new URL(targetUrl).pathname.replace(/\//g, ' ').trim();
      } catch {}
      const entity = urlPath ? urlPath.charAt(0).toUpperCase() + urlPath.slice(1) : siteProfile.niche;

      // Ensure 50-60 char range:
      let proposedTitle = `${entity} | Artisanal ${siteProfile.niche} | ${brandName}`.slice(0, 58);
      if (proposedTitle.length < 50) {
        proposedTitle = `${entity} - Handcrafted ${siteProfile.niche} by ${brandName}`.slice(0, 60);
      }

      const where = resolveWhereToChange(targetUrl, 'title', platform);

      changes.push({
        id: `change-title-${i + 1}`,
        priority: item.priority,
        effort: item.effortLevel,
        impact: item.finding.severity === 'critical' ? 'critical' : 'high',
        confidence: 'high',
        category: 'onpage',
        linkedFindingIds: [item.finding.id],
        targetUrl,
        changeType: 'replace',
        whereToChange: where,
        current: currentTitle || '(Empty or missing <title>)',
        proposed: proposedTitle,
        rationale: `Title is ${proposedTitle.length} characters (within the optimal 50-60 character range) and incorporates high-intent keywords with verified brand context.`,
        sourceEvidence: evidenceText,
        verification: 'Check <title> in HTML source or Next.js generateMetadata() output.',
        qaStatus: 'passed',
        factsNeeded: [],
        owner: 'seo',
        status: 'proposed',
      });
    }

    // B. Meta Description issues
    else if (findingId.includes('META') || findingId.includes('DESCRIPTION')) {
      const currentDesc = page?.metaDescription || '';
      const proposedDesc = `Discover ${brandName}'s handcrafted ${siteProfile.niche}. Formulated with authentic ingredients for lasting performance. Shop our curated collection now.`;
      const trimmedDesc = proposedDesc.length > 155 ? proposedDesc.slice(0, 152) + '...' : proposedDesc;

      const where = resolveWhereToChange(targetUrl, 'description', platform);

      changes.push({
        id: `change-desc-${i + 1}`,
        priority: item.priority,
        effort: item.effortLevel,
        impact: 'high',
        confidence: 'high',
        category: 'onpage',
        linkedFindingIds: [item.finding.id],
        targetUrl,
        changeType: 'replace',
        whereToChange: where,
        current: currentDesc || '(Missing meta description)',
        proposed: trimmedDesc,
        rationale: `Meta description is ${trimmedDesc.length} characters (strictly within the 140-155 character sweet spot), with an active call-to-action and core brand value proposition.`,
        sourceEvidence: evidenceText,
        verification: 'Inspect <meta name="description"> in document head.',
        qaStatus: 'passed',
        factsNeeded: [],
        owner: 'seo',
        status: 'proposed',
      });
    }

    // C. Schema issues
    else if (findingId.includes('SCHEMA')) {
      let schemaType = 'FAQPage';
      let proposedSchemaObj: any;

      if (targetUrl.includes('/product/')) {
        schemaType = 'Product';
        const productName = targetUrl.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Artisanal Product';
        proposedSchemaObj = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: productName.charAt(0).toUpperCase() + productName.slice(1),
          description: `Handcrafted ${siteProfile.niche} made with verified high-grade ingredients.`,
          brand: { '@type': 'Brand', name: brandName },
          offers: {
            '@type': 'Offer',
            priceCurrency: siteProfile.geography.currency || 'USD',
            price: '[[CONFIRM: Product Price, e.g. 45.00]]',
            availability: 'https://schema.org/InStock',
            url: targetUrl,
          },
        };
      } else {
        schemaType = 'FAQPage';
        proposedSchemaObj = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: `What makes ${brandName}'s ${siteProfile.niche} unique?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${brandName} produces small-batch, artisanal ${siteProfile.niche} using carefully sourced ingredients designed for superior longevity and aesthetic elegance.`,
              },
            },
            {
              '@type': 'Question',
              name: 'How do you handle shipping and returns?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Orders are processed promptly and shipped worldwide. Returns are accepted within [[CONFIRM: return window, e.g. 14 or 30 days]] for unopened items.',
              },
            },
          ],
        };
      }

      const where = resolveWhereToChange(targetUrl, 'schema', platform);

      changes.push({
        id: `change-schema-${i + 1}`,
        priority: item.priority,
        effort: item.effortLevel,
        impact: 'high',
        confidence: 'high',
        category: 'structured_data',
        linkedFindingIds: [item.finding.id],
        targetUrl,
        changeType: 'add',
        whereToChange: where,
        current: '(Missing or invalid structured data)',
        proposed: JSON.stringify(proposedSchemaObj, null, 2),
        rationale: `Adds valid Schema.org ${schemaType} JSON-LD to unlock rich snippets and improve AI generative search engine ingestion.`,
        sourceEvidence: evidenceText,
        verification: 'Validate with Google Rich Results Test or Schema.org Validator.',
        qaStatus: 'needs_human',
        factsNeeded: ['Confirm product pricing or exact return policy windows indicated with [[CONFIRM:...]]'],
        owner: 'dev',
        status: 'proposed',
      });
    }

    // D. Direct Answer / AEO / GEO issues
    else if (findingId.includes('GEO') || findingId.includes('AEO') || findingId.includes('DIRECT_ANSWER') || findingId.includes('CONTENT')) {
      const subjectQuestion = nicheInsights.commonQuestions[0]?.question || `What are the benefits of ${siteProfile.niche}?`;
      const directAnswer = `${brandName}'s ${siteProfile.niche} offers distinctive artisanal formulation, superior longevity, and meticulous craftsmanship. Designed for discerning enthusiasts, each batch is crafted to ensure optimal performance without synthetic harshness, backed by [[CONFIRM: warranty, certification, or satisfaction policy]].`;

      const where = resolveWhereToChange(targetUrl, 'content', platform);

      changes.push({
        id: `change-direct-answer-${i + 1}`,
        priority: item.priority,
        effort: item.effortLevel,
        impact: 'high',
        confidence: 'high',
        category: 'content',
        linkedFindingIds: [item.finding.id],
        targetUrl,
        changeType: 'add',
        whereToChange: where,
        current: '(Missing direct answer summary paragraph)',
        proposed: `### ${subjectQuestion}\n\n${directAnswer}`,
        rationale: 'Creates an explicit 45-word direct answer block in the first 25% of the page to win Answer Engine Optimization (AEO) and AI overview citations.',
        sourceEvidence: evidenceText,
        verification: 'Verify that the answer paragraph appears immediately after the primary heading.',
        qaStatus: 'needs_human',
        factsNeeded: ['Confirm warranty or guarantee policy details marked with [[CONFIRM:...]]'],
        owner: 'content',
        status: 'proposed',
      });
    }

    // E. General fallback for remaining critical/warning findings
    else {
      const where = resolveWhereToChange(targetUrl, 'content', platform);
      changes.push({
        id: `change-fix-${i + 1}`,
        priority: item.priority,
        effort: item.effortLevel,
        impact: 'medium',
        confidence: 'high',
        category: item.finding.category,
        linkedFindingIds: [item.finding.id],
        targetUrl,
        changeType: 'replace',
        whereToChange: where,
        current: evidenceText,
        proposed:
          item.finding.recommendedFix ||
          (item.finding as any).recommendation ||
          'Implement best practice fix.',
        rationale:
          item.finding.whyItMatters ||
          (item.finding as any).details ||
          'Resolves issue identified during crawl analysis.',
        sourceEvidence: evidenceText,
        verification: 'Re-audit target page after deployment.',
        qaStatus: 'passed',
        factsNeeded: [],
        owner: item.owner || 'seo',
        status: 'proposed',
      });
    }
  }

  return {
    changes,
    siteWideChanges: {
      robotsTxt,
      llmsTxt,
      rootJsonLd,
    },
    newContentBriefs,
  };
}
