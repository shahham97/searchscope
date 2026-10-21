import { NextRequest, NextResponse } from 'next/server';
import { runCompleteAudit } from '@/lib/audit-runner';

export const maxDuration = 60; // 60s for Vercel functions (if supported on plan)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, config } = body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'A valid target domain or URL is required.' },
        { status: 400 }
      );
    }

    const report = await runCompleteAudit(url, config);
    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected audit failure occurred.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
