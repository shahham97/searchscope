import { Agent, request } from 'undici';
import dns from 'dns';
import { validateHostSafety, isPrivateOrReservedIp, isSameDomainOrSubdomain } from './ssrf';
import { FailureCode } from '../../types/audit';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowedHostname?: string;
  allowSubdomains?: boolean;
  userAgentType?: 'browser' | 'bot';
  customUserAgent?: string;
  retryCount?: number;
}

export interface SafeFetchResponse {
  url: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  redirectChain: string[];
  contentType: string;
  contentLength: number;
  failureCode?: FailureCode;
  failureHint?: string;
}

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

export const BOT_USER_AGENT =
  'SearchScope-Auditor/1.0 (+https://searchscope.app/bot; privacy-first website auditor)';

export const DEFAULT_TIMEOUT_MS = 10000;
export const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB limit for rich modern hydration payloads
export const MAX_REDIRECTS = 10;

/**
 * Creates an undici Agent that validates resolved IP addresses at connection time
 * while preserving SNI and Host headers for proper TLS handshakes.
 */
function createSafeAgent(): Agent {
  return new Agent({
    connect: {
      lookup: (hostname: string, options: any, callback: (err: any, address?: any, family?: any) => void) => {
        dns.lookup(hostname, options, (err, addresses, family) => {
          if (err) return callback(err);

          const addressList: { address: string; family: number }[] = Array.isArray(addresses)
            ? addresses
            : [{ address: addresses as string, family: family || 4 }];

          if (addressList.length === 0) {
            return callback(new Error(`DNS resolution returned zero records for ${hostname}`));
          }

          // Verify every resolved address is safe and public
          for (const entry of addressList) {
            if (isPrivateOrReservedIp(entry.address)) {
              return callback(
                new Error(`SSRF Block: Resolved IP ${entry.address} is a reserved/private address.`)
              );
            }
          }

          // Return in the exact shape undici expects based on options.all
          if (options && options.all) {
            callback(null, addressList);
          } else {
            callback(null, addressList[0].address, addressList[0].family);
          }
        });
      },
    },
    pipelining: 0,
    keepAliveTimeout: 5000,
  });
}

const safeAgent = createSafeAgent();

export function categorizeError(error: unknown, statusCode?: number, body?: string): { code: FailureCode; hint: string } {
  const errStr = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (statusCode === 403 || statusCode === 429) {
    if (
      body &&
      (body.includes('challenge') ||
        body.includes('cf-browser-verification') ||
        body.includes('turnstile') ||
        body.includes('waf') ||
        body.includes('just a moment'))
    ) {
      return {
        code: 'WAF_CHALLENGE',
        hint: 'Access restricted by web application firewall (Cloudflare/Vercel Attack Challenge/WAF).',
      };
    }
    return {
      code: 'HTTP_4XX',
      hint: `Server returned HTTP ${statusCode} Access Forbidden/Rate Limited.`,
    };
  }

  if (statusCode && statusCode >= 500) {
    return {
      code: 'HTTP_5XX',
      hint: `Target web server responded with server error (HTTP ${statusCode}).`,
    };
  }

  if (statusCode && statusCode >= 400) {
    return {
      code: 'HTTP_4XX',
      hint: `Target resource returned client error (HTTP ${statusCode}).`,
    };
  }

  if (errStr.includes('ssrf block') || errStr.includes('reserved') || errStr.includes('private')) {
    return {
      code: 'SSRF_BLOCKED',
      hint: 'Blocked by SSRF security policy (private, loopback, or cloud metadata address).',
    };
  }

  if (errStr.includes('enotfound') || errStr.includes('dns lookup failed') || errStr.includes('eai_again')) {
    return {
      code: 'DNS_FAILURE',
      hint: 'Unable to resolve domain name in DNS. Verify domain spelling and DNS records.',
    };
  }

  if (errStr.includes('tls') || errStr.includes('ssl') || errStr.includes('cert') || errStr.includes('handshake')) {
    return {
      code: 'TLS_ERROR',
      hint: 'TLS/SSL handshake failed. Possible expired or invalid SSL certificate on target host.',
    };
  }

  if (errStr.includes('econnrefused') || errStr.includes('connection refused')) {
    return {
      code: 'CONNECTION_REFUSED',
      hint: 'Connection refused by destination port. Ensure the server is listening on port 80/443.',
    };
  }

  if (errStr.includes('timeout') || errStr.includes('timed out') || errStr.includes('aborted')) {
    return {
      code: 'TIMEOUT',
      hint: 'Request exceeded response timeout. Target server was slow or unresponsive.',
    };
  }

  if (errStr.includes('too many redirects') || errStr.includes('redirect loop')) {
    return {
      code: 'REDIRECT_LOOP',
      hint: 'Exceeded maximum redirect depth (possible redirect cycle).',
    };
  }

  if (errStr.includes('exceeded limit') || errStr.includes('too large')) {
    return {
      code: 'BODY_TOO_LARGE',
      hint: 'Response payload exceeded safe maximum size limit (5 MB).',
    };
  }

  return {
    code: 'CONNECTION_REFUSED',
    hint: `Connection failed: ${errStr.slice(0, 100)}`,
  };
}

/**
 * Performs a secure, SSRF-protected HTTP/HTTPS fetch with manual redirect tracking,
 * apex <-> www domain equivalence, retry logic, and typed failure taxonomy.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const userAgent =
    options.customUserAgent ||
    (options.userAgentType === 'bot' ? BOT_USER_AGENT : BROWSER_USER_AGENT);

  let currentUrl = targetUrl;
  const redirectChain: string[] = [];

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error(`Invalid URL format: ${currentUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Blocked unsupported protocol: ${parsed.protocol}`);
    }

    if (parsed.port && !['80', '443', '8080', '8443'].includes(parsed.port)) {
      throw new Error(`Blocked non-standard port: ${parsed.port}`);
    }

    // SSRF Check for current hop hostname
    const safety = await validateHostSafety(parsed.hostname);
    if (!safety.isValid) {
      throw new Error(`SSRF Block: ${safety.reason}`);
    }

    // Host scope enforcement with apex <-> www equivalence support
    if (options.allowedHostname) {
      const isAllowed = isSameDomainOrSubdomain(
        parsed.hostname,
        options.allowedHostname,
        options.allowSubdomains ?? false
      );
      if (!isAllowed) {
        throw new Error(
          `Redirect left allowed domain scope: ${currentUrl} (base: ${options.allowedHostname})`
        );
      }
    }

    const startTime = Date.now();
    let res: any;

    try {
      res = await request(currentUrl, {
        dispatcher: safeAgent,
        method: 'GET',
        headers: {
          'user-agent': userAgent,
          'accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
          'connection': 'close',
        },
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
      });
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const { code, hint } = categorizeError(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw Object.assign(new Error(errorMsg), {
        failureCode: code,
        failureHint: hint,
        durationMs,
      });
    }

    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusText = res.statusMessage || (statusCode === 200 ? 'OK' : `HTTP ${statusCode}`);

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) {
      if (typeof v === 'string') {
        headers[k.toLowerCase()] = v;
      } else if (Array.isArray(v)) {
        headers[k.toLowerCase()] = v.join(', ');
      }
    }

    // Handle redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(statusCode) && headers['location']) {
      redirectChain.push(currentUrl);
      const nextLocation = headers['location'];
      try {
        currentUrl = new URL(nextLocation, parsed).toString();
      } catch {
        throw new Error(`Invalid redirect Location: ${nextLocation}`);
      }

      if (hop === maxRedirects) {
        const { code, hint } = categorizeError(new Error('Too many redirects'));
        throw Object.assign(new Error(`Exceeded maximum redirect limit (${maxRedirects})`), {
          failureCode: code,
          failureHint: hint,
          durationMs,
        });
      }
      continue;
    }

    // Read response body safely within maxBytes limit
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    for await (const chunk of res.body) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        res.body.destroy();
        const { code, hint } = categorizeError(new Error('Response body too large'));
        throw Object.assign(new Error(`Response exceeded maximum size of ${maxBytes} bytes`), {
          failureCode: code,
          failureHint: hint,
          durationMs,
        });
      }
      chunks.push(chunk);
    }

    const bodyBuffer = Buffer.concat(chunks);
    const body = bodyBuffer.toString('utf-8');
    const contentType = headers['content-type'] || 'text/html';

    // Check for HTTP 4xx / 5xx or WAF challenge
    let failureCode: FailureCode | undefined;
    let failureHint: string | undefined;

    if (statusCode >= 400) {
      const cat = categorizeError(null, statusCode, body);
      failureCode = cat.code;
      failureHint = cat.hint;
    }

    return {
      url: currentUrl,
      statusCode,
      statusText,
      headers,
      body,
      durationMs,
      redirectChain,
      contentType,
      contentLength: bodyBuffer.length,
      failureCode,
      failureHint,
    };
  }

  throw new Error('Unexpected termination of fetch pipeline');
}
