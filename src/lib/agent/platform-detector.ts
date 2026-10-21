import { ExtractedPageData } from '../../types/audit';
import { DetectedPlatform, WhereToChangeLocation } from './types';

/**
 * Detects the web platform running the target site by analyzing HTML footprints,
 * script paths, headers, and DOM identifiers.
 */
export function detectPlatform(pages: ExtractedPageData[]): {
  platform: DetectedPlatform;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
} {
  const evidence: string[] = [];
  let isNextApp = false;
  let isNextPages = false;
  let isShopify = false;
  let isWordPress = false;
  let isWooCommerce = false;
  let isWebflow = false;
  let isWix = false;

  for (const page of pages.slice(0, 10)) {
    const textSnippet = (page.textSnippet || '').toLowerCase();
    const headers = JSON.stringify((page as any).headers || '').toLowerCase();

    // Look at page internal links and scripts
    const htmlSnippets = [
      page.canonicalUrl || '',
      ...page.internalLinks.map((l) => l.url),
      ...page.images.map((i) => i.src),
    ].join(' ').toLowerCase();

    if (htmlSnippets.includes('_next/static/chunks/app') || htmlSnippets.includes('/_next/')) {
      isNextApp = true;
      evidence.push('Next.js App Router build chunks detected (/_next/static/chunks/app/)');
    } else if (htmlSnippets.includes('_next/static/chunks/pages')) {
      isNextPages = true;
      evidence.push('Next.js Pages Router build chunks detected (/_next/static/chunks/pages/)');
    }

    if (htmlSnippets.includes('cdn.shopify.com') || htmlSnippets.includes('shopify.theme')) {
      isShopify = true;
      evidence.push('Shopify CDN and theme script assets detected');
    }

    if (htmlSnippets.includes('wp-content') || htmlSnippets.includes('wp-includes')) {
      isWordPress = true;
      evidence.push('WordPress core directories (/wp-content/, /wp-includes/) detected');
      if (htmlSnippets.includes('woocommerce') || textSnippet.includes('add to cart')) {
        isWooCommerce = true;
        evidence.push('WooCommerce storefront indicators detected');
      }
    }

    if (htmlSnippets.includes('webflow.com') || htmlSnippets.includes('assets.website-files.com')) {
      isWebflow = true;
      evidence.push('Webflow CSS/CDN assets detected');
    }

    if (htmlSnippets.includes('wix.com') || htmlSnippets.includes('parastorage.com')) {
      isWix = true;
      evidence.push('Wix site runtime detected');
    }
  }

  if (isNextApp) {
    return { platform: 'nextjs_app_router', confidence: 'high', evidence };
  }
  if (isNextPages) {
    return { platform: 'nextjs_pages_router', confidence: 'high', evidence };
  }
  if (isWooCommerce) {
    return { platform: 'woocommerce', confidence: 'high', evidence };
  }
  if (isShopify) {
    return { platform: 'shopify', confidence: 'high', evidence };
  }
  if (isWordPress) {
    return { platform: 'wordpress', confidence: 'high', evidence };
  }
  if (isWebflow) {
    return { platform: 'webflow', confidence: 'high', evidence };
  }
  if (isWix) {
    return { platform: 'wix', confidence: 'high', evidence };
  }

  return {
    platform: 'custom_html',
    confidence: 'low',
    evidence: ['No specific CMS or framework footprint matched; treated as standard HTML/Web application'],
  };
}

/**
 * Resolves the exact location, file path, and implementation instruction for a change
 * based on the target URL, change subject, and detected platform.
 */
export function resolveWhereToChange(
  url: string,
  subject: 'title' | 'description' | 'h1' | 'content' | 'product_description' | 'schema' | 'robots' | 'llms' | 'sitemap',
  platform: DetectedPlatform
): WhereToChangeLocation {
  let path = '/';
  try {
    path = new URL(url).pathname;
  } catch {
    path = url;
  }

  const isHome = path === '/' || path === '';
  const isProduct = path.includes('/product/') || path.includes('/shop/');
  const isBlog = path.includes('/blog/') || path.includes('/article/') || path.includes('/news/');

  // 1. Next.js App Router (e.g. kingshyer.com)
  if (platform === 'nextjs_app_router') {
    if (subject === 'robots') {
      return {
        humanReadable: 'robots.txt metadata file',
        detectedPlatform: platform,
        confidence: 'high',
        platformInstruction: 'Next.js App Router metadata route or static file in /public',
        suggestedFilePath: 'src/app/robots.ts (or public/robots.txt)',
        codeAnchor: 'export default function robots(): MetadataRoute.Robots',
      };
    }
    if (subject === 'sitemap') {
      return {
        humanReadable: 'sitemap.xml metadata file',
        detectedPlatform: platform,
        confidence: 'high',
        platformInstruction: 'Next.js App Router dynamic sitemap route or static sitemap',
        suggestedFilePath: 'src/app/sitemap.ts (or public/sitemap.xml)',
        codeAnchor: 'export default function sitemap(): MetadataRoute.Sitemap',
      };
    }
    if (subject === 'llms') {
      return {
        humanReadable: 'Root /llms.txt AI Agent context manifest',
        detectedPlatform: platform,
        confidence: 'high',
        platformInstruction: 'Place directly in the static public directory to serve at /llms.txt',
        suggestedFilePath: 'public/llms.txt',
      };
    }

    if (isHome) {
      if (subject === 'title' || subject === 'description') {
        return {
          humanReadable: `Homepage (${path}), <${subject === 'title' ? 'title' : 'meta name="description"'}>`,
          detectedPlatform: platform,
          confidence: 'high',
          platformInstruction: 'Next.js root page or layout metadata object export',
          suggestedFilePath: 'src/app/page.tsx (or src/app/layout.tsx)',
          codeAnchor: `export const metadata: Metadata = { ${subject}: "..." }`,
          cssSelector: subject === 'title' ? 'head > title' : 'head > meta[name="description"]',
        };
      }
      if (subject === 'schema') {
        return {
          humanReadable: 'Homepage Organization & WebSite JSON-LD Schema',
          detectedPlatform: platform,
          confidence: 'high',
          platformInstruction: 'Render inside <script type="application/ld+json"> in root layout or page',
          suggestedFilePath: 'src/app/layout.tsx',
          codeAnchor: '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />',
        };
      }
    }

    if (isProduct) {
      return {
        humanReadable: `Product page (${path}), ${subject}`,
        detectedPlatform: platform,
        confidence: 'high',
        platformInstruction: 'Next.js dynamic product route generateMetadata() or JSX body',
        suggestedFilePath: 'src/app/product/[slug]/page.tsx (or src/app/shop/[slug]/page.tsx)',
        codeAnchor: subject === 'title' || subject === 'description' ? 'export async function generateMetadata({ params })' : '<main>',
        cssSelector: subject === 'title' ? 'head > title' : subject === 'h1' ? 'h1' : '.product-description',
      };
    }

    return {
      humanReadable: `Page (${path}), ${subject}`,
      detectedPlatform: platform,
      confidence: 'medium',
      platformInstruction: 'Next.js App Router route page.tsx metadata export',
      suggestedFilePath: `src/app${path}/page.tsx`,
      codeAnchor: 'export const metadata: Metadata = { ... }',
      cssSelector: subject === 'title' ? 'head > title' : subject === 'h1' ? 'h1' : 'main',
    };
  }

  // 2. Shopify
  if (platform === 'shopify') {
    if (isProduct) {
      return {
        humanReadable: `Shopify Product (${path})`,
        detectedPlatform: platform,
        confidence: 'high',
        platformInstruction: 'Shopify Admin > Products > Select product > "Search engine listing" section at the bottom of the editor',
        suggestedFilePath: 'Shopify Admin / Products / [Product]',
      };
    }
    return {
      humanReadable: `Shopify Storefront (${path})`,
      detectedPlatform: platform,
      confidence: 'high',
      platformInstruction: 'Shopify Admin > Online Store > Preferences (Homepage) OR Navigation/Pages',
      suggestedFilePath: 'Shopify Admin / Online Store',
    };
  }

  // 3. WordPress
  if (platform === 'wordpress' || platform === 'woocommerce') {
    return {
      humanReadable: `WordPress Page (${path})`,
      detectedPlatform: platform,
      confidence: 'high',
      platformInstruction: 'WP Admin > Pages/Posts > Edit page > Yoast SEO / Rank Math panel at bottom of editor',
      suggestedFilePath: 'WordPress Admin Editor',
    };
  }

  // 4. Fallback / Custom HTML
  return {
    humanReadable: `Web Page (${path}), ${subject}`,
    detectedPlatform: platform,
    confidence: 'low',
    platformInstruction: `Edit the HTML source template for ${path} at the specified element`,
    suggestedFilePath: `HTML template for ${path}`,
    cssSelector: subject === 'title' ? 'head > title' : subject === 'h1' ? 'h1' : 'main',
  };
}
