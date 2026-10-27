import { ExtractedPageData, Finding } from '../../types/audit';

export interface MobileParityReport {
  viewportIssues: string[];
  tapTargetIssues: string[];
  jsDependentPages: string[];
  findings: Finding[];
}

export function analyzeMobileAndRenderingParity(pages: ExtractedPageData[]): MobileParityReport {
  const findings: Finding[] = [];
  const viewportIssues: string[] = [];
  const tapTargetIssues: string[] = [];
  const jsDependentPages: string[] = [];

  for (const page of pages) {
    if (!page.isHtml || page.statusCode !== 200) continue;

    // 1. Viewport Check
    const vp = (page.viewport || '').toLowerCase();
    if (!vp) {
      viewportIssues.push(page.url);
    } else if (vp.includes('user-scalable=no') || vp.includes('maximum-scale=1')) {
      findings.push({
        id: `MOBILE_USER_SCALABLE_DISABLED-${page.normalizedUrl}`,
        category: 'technical',
        severity: 'medium',
        title: 'Mobile Viewport Disables User Zooming (user-scalable=no)',
        description: 'The viewport meta tag specifies user-scalable=no or maximum-scale=1, which blocks users from zooming on mobile devices.',
        evidence: `Viewport: "${page.viewport}" on ${page.url}`,
        affectedUrl: page.url,
        affectedUrls: [page.url],
        whyItMatters: 'Blocking pinch-to-zoom violates WCAG 2.2 AA accessibility guidelines and degrades mobile user experience.',
        confidence: 'high',
        recommendedFix: 'Use <meta name="viewport" content="width=device-width, initial-scale=1"> and allow user pinch-zoom.',
        effort: 'quick_win',
        validationInstructions: 'Inspect meta name="viewport" and remove user-scalable=no.',
      });
    }

    // 2. Raw vs Rendered DOM Parity
    if (page.isJsRendered || page.isH1OnlyInJs) {
      jsDependentPages.push(page.url);

      if (page.isH1OnlyInJs) {
        findings.push({
          id: `PARITY_H1_JS_ONLY-${page.normalizedUrl}`,
          category: 'onpage',
          severity: 'medium',
          title: 'Primary <h1> Heading Only Present After JavaScript Execution',
          evidence: `Raw server HTML has 0 <h1> elements; rendered DOM contains: "${page.renderedH1s?.join(', ')}"`,
          affectedUrl: page.url,
          affectedUrls: [page.url],
          whyItMatters: 'Search bots and lightweight crawlers that do not run JavaScript will see a missing <h1> heading.',
          confidence: 'high',
          recommendedFix: 'Render the primary <h1> in initial server-side HTML (SSR/SSG) rather than injecting it via client-side hydration.',
          effort: 'moderate',
          validationInstructions: 'View page source (Ctrl+U) and ensure <h1> is visible in the raw initial HTML.',
        });
      }
    }
  }

  if (viewportIssues.length > 0) {
    findings.push({
      id: 'MOBILE_VIEWPORT_MISSING',
      category: 'technical',
      severity: 'high',
      title: `${viewportIssues.length} Page(s) Missing Mobile Viewport Meta Tag`,
      description: 'Pages lack a meta name="viewport" tag, causing mobile browsers to render a zoomed-out desktop layout.',
      evidence: `Affected pages: ${viewportIssues.slice(0, 3).join(', ')}`,
      affectedUrl: viewportIssues[0],
      affectedUrls: viewportIssues,
      whyItMatters: 'Mobile-first indexing requires responsive viewport configuration for proper mobile ranking.',
      confidence: 'high',
      recommendedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
      effort: 'quick_win',
      validationInstructions: 'Check <head> for standard responsive viewport tag.',
    });
  }

  return {
    viewportIssues,
    tapTargetIssues,
    jsDependentPages,
    findings,
  };
}
