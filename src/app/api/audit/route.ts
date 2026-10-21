import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runCompleteAudit } from '@/lib/audit-runner';

export const maxDuration = 60; // 60s max execution duration for Vercel functions
export const dynamic = 'force-dynamic';

// Strict Zod schema for input validation
const AuditInputSchema = z.object({
  url: z.string().trim().min(3).max(2048),
  config: z
    .object({
      auditDepth: z.enum(['quick', 'standard', 'deep']).optional(),
      maxPages: z.number().int().min(1).max(250).optional(),
      includeContentAnalysis: z.boolean().optional(),
      includeAeoGeo: z.boolean().optional(),
      includeStructuredData: z.boolean().optional(),
      checkBrokenLinks: z.boolean().optional(),
      searchDiscoveryEnabled: z.boolean().optional(),
      userAgentType: z.enum(['browser', 'bot']).optional(),
      respectRobotsTxt: z.boolean().optional(),
      enableHeadlessRendering: z.boolean().optional(),
    })
    .optional(),
});

// Simple in-memory rate limiter per IP (max 15 audits per 10 minutes)
const ipRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 15;

  const record = ipRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a few minutes before launching another audit.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = AuditInputSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: `Validation error: ${issue.path.join('.')} — ${issue.message}` },
        { status: 400 }
      );
    }

    const { url, config } = parseResult.data;

    // Structured server log without PII
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'audit_started',
        targetUrl: url,
        depth: config?.auditDepth || 'quick',
        timestamp: new Date().toISOString(),
      })
    );

    const report = await runCompleteAudit(url, config);

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'audit_completed',
        targetUrl: url,
        pagesCrawled: report.crawlStats.totalPagesCrawled,
        successfulPages: report.crawlStats.successfulPagesCount,
        overallScore: report.overallScore,
        isCrawlFailed: report.isCrawlFailed,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected audit failure occurred.';
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'audit_failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
