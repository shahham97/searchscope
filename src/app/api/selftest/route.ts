import { NextResponse } from 'next/server';
import { safeFetch } from '@/lib/security/safe-fetch';
import { validateHostSafety } from '@/lib/security/ssrf';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const targets = [
    'https://example.com',
    'https://kingshyer.com',
    'https://vercel.com',
  ];

  const results: any[] = [];
  let allPassed = true;

  for (const targetUrl of targets) {
    const parsed = new URL(targetUrl);
    const dnsStart = Date.now();
    const dnsSafety = await validateHostSafety(parsed.hostname);
    const dnsDurationMs = Date.now() - dnsStart;

    const fetchStart = Date.now();
    try {
      const res = await safeFetch(targetUrl, {
        timeoutMs: 8000,
        allowedHostname: parsed.hostname,
        allowSubdomains: true,
      });

      const totalFetchMs = Date.now() - fetchStart;
      const $ = cheerio.load(res.body);
      const title = $('title').first().text().trim();
      const wordsCount = ($('body').text().match(/\b[\w'-]+\b/g) || []).length;

      const passed = res.statusCode >= 200 && res.statusCode < 400 && wordsCount > 0;
      if (!passed) allPassed = false;

      results.push({
        targetUrl,
        passed,
        resolvedIp: dnsSafety.ip,
        dnsDurationMs,
        totalFetchMs,
        statusCode: res.statusCode,
        statusText: res.statusText,
        redirectChain: res.redirectChain,
        title,
        wordCount: wordsCount,
        contentLength: res.contentLength,
        failureCode: res.failureCode,
        failureHint: res.failureHint,
      });
    } catch (err: any) {
      allPassed = false;
      const totalFetchMs = Date.now() - fetchStart;
      results.push({
        targetUrl,
        passed: false,
        resolvedIp: dnsSafety.ip,
        dnsDurationMs,
        totalFetchMs,
        error: err.message,
        failureCode: err.failureCode || 'CONNECTION_REFUSED',
        failureHint: err.failureHint || 'Request failed',
      });
    }
  }

  return NextResponse.json(
    {
      status: allPassed ? 'HEALTHY' : 'DEGRADED',
      allPassed,
      timestamp: new Date().toISOString(),
      results,
    },
    { status: 200 }
  );
}
