import * as cheerio from 'cheerio';

export interface HeadlessRenderResult {
  renderedHtml: string;
  isJsRendered: boolean;
  rawH1s?: string[];
  renderedH1s?: string[];
  isH1OnlyInJs?: boolean;
  rawVsRenderedDiff?: {
    rawWordCount: number;
    renderedWordCount: number;
    wordCountDiff: number;
    headingsDiff: number;
    linksDiff: number;
    schemaDiff: number;
    dependsOnJs: boolean;
  };
}

/**
 * Checks if raw HTML indicates an obvious client-rendered SPA shell.
 */
export function isLikelySpaShell(html: string, wordCount: number): boolean {
  if (wordCount > 300) return false;
  const lower = html.toLowerCase();
  const hasSpaContainer =
    lower.includes('id="root"') ||
    lower.includes('id="__next"') ||
    lower.includes('id="app"') ||
    lower.includes('data-reactroot');

  const hasScriptTags = lower.includes('<script');
  return hasSpaContainer && hasScriptTags && wordCount < 150;
}

/**
 * Attempts to render the page using headless Chromium if enabled and available.
 * Fails safely if headless binary is unsupported in the current runtime environment.
 */
export async function renderHeadlessDom(
  url: string,
  rawHtml: string
): Promise<HeadlessRenderResult> {
  const $raw = cheerio.load(rawHtml);
  // Extract raw headings from FULL untouched DOM
  const rawH1s: string[] = [];
  $raw('h1').each((_, el) => {
    const t = $raw(el).text().trim();
    if (t) rawH1s.push(t);
  });
  const rawHeadingsCount = $raw('h1, h2, h3').length;
  const rawLinksCount = $raw('a[href]').length;
  const rawSchemaCount = $raw('script[type="application/ld+json"]').length;

  const rawClone = $raw('body').clone();
  rawClone.find('script, style, noscript, svg, nav, footer, header').remove();
  const rawWords = (rawClone.text().match(/\b[\w'-]+\b/g) || []).length;

  try {
    const chromium = await import('@sparticuz/chromium').then((m) => m.default || m);
    const playwright = await import('playwright-core').then((m) => m.default || m);

    // Launch Chromium with resource-blocking to conserve memory
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      return { renderedHtml: rawHtml, isJsRendered: false, rawH1s };
    }

    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Block heavy static assets
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot,mp4,webm}', (route) =>
      route.abort()
    );

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    // Brief settling delay for hydration
    await page.waitForTimeout(1000);

    const renderedHtml = await page.content();
    await browser.close();

    const $rendered = cheerio.load(renderedHtml);
    const renderedH1s: string[] = [];
    $rendered('h1').each((_, el) => {
      const t = $rendered(el).text().trim();
      if (t) renderedH1s.push(t);
    });
    const renderedHeadingsCount = $rendered('h1, h2, h3').length;
    const renderedLinksCount = $rendered('a[href]').length;
    const renderedSchemaCount = $rendered('script[type="application/ld+json"]').length;

    const renderedClone = $rendered('body').clone();
    renderedClone.find('script, style, noscript, svg, nav, footer, header').remove();
    const renderedWords = (renderedClone.text().match(/\b[\w'-]+\b/g) || []).length;

    const wordDiff = renderedWords - rawWords;
    const dependsOnJs = wordDiff > 100 || (rawWords < 80 && renderedWords > 200);
    const isH1OnlyInJs = rawH1s.length === 0 && renderedH1s.length > 0;

    return {
      renderedHtml,
      isJsRendered: true,
      rawH1s,
      renderedH1s,
      isH1OnlyInJs,
      rawVsRenderedDiff: {
        rawWordCount: rawWords,
        renderedWordCount: renderedWords,
        wordCountDiff: wordDiff,
        headingsDiff: renderedHeadingsCount - rawHeadingsCount,
        linksDiff: renderedLinksCount - rawLinksCount,
        schemaDiff: renderedSchemaCount - rawSchemaCount,
        dependsOnJs,
      },
    };
  } catch (err: unknown) {
    // If headless environment fails or is unsupported on this OS/container, fall back seamlessly
    return { renderedHtml: rawHtml, isJsRendered: false, rawH1s };
  }
}
