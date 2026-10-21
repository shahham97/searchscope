import http from 'http';
import https from 'https';
import { validateHostSafety, isPrivateOrReservedIp } from './ssrf';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowedHostname?: string; // If set, cross-domain redirects are rejected
  allowSubdomains?: boolean;
  userAgent?: string;
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
}

export const DEFAULT_USER_AGENT =
  'SearchScope-Auditor/1.0 (+https://searchscope.app/bot; ethical seo-aeo-geo auditor)';

export const MAX_BODY_BYTES = 2.5 * 1024 * 1024; // 2.5 MB max per page
export const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds per request
export const MAX_REDIRECTS = 5;

/**
 * Performs a secure, SSRF-protected HTTP/HTTPS fetch with manual redirect following
 * and per-hop DNS safety validation.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  let currentUrl = targetUrl;
  const redirectChain: string[] = [];

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error(`Invalid URL: ${currentUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Blocked unsupported protocol: ${parsed.protocol}`);
    }

    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
      throw new Error(`Blocked non-standard port: ${parsed.port}`);
    }

    // SSRF Check for the current hop's hostname
    const safety = await validateHostSafety(parsed.hostname);
    if (!safety.isValid) {
      throw new Error(`SSRF Prevention Block: ${safety.reason}`);
    }

    // Host scope enforcement if allowedHostname provided
    if (options.allowedHostname) {
      const allowed = options.allowedHostname.toLowerCase();
      const current = parsed.hostname.toLowerCase();
      const isExactMatch = current === allowed;
      const isSubdomain = options.allowSubdomains && current.endsWith(`.${allowed}`);
      if (!isExactMatch && !isSubdomain) {
        throw new Error(`Redirect left allowed domain scope: ${currentUrl} (base: ${allowed})`);
      }
    }

    const startTime = Date.now();
    const result = await executeSingleRequest({
      url: parsed,
      timeoutMs,
      maxBytes,
      userAgent,
    });

    const durationMs = Date.now() - startTime;

    // Check for redirects (301, 302, 303, 307, 308)
    if (
      [301, 302, 303, 307, 308].includes(result.statusCode) &&
      result.headers['location']
    ) {
      redirectChain.push(currentUrl);
      const nextLocation = result.headers['location'];
      try {
        currentUrl = new URL(nextLocation, parsed).toString();
      } catch {
        throw new Error(`Invalid redirect Location: ${nextLocation}`);
      }

      if (hop === maxRedirects) {
        throw new Error(`Too many redirects (exceeded limit of ${maxRedirects})`);
      }
      continue;
    }

    return {
      url: currentUrl,
      statusCode: result.statusCode,
      statusText: result.statusText,
      headers: result.headers,
      body: result.body,
      durationMs,
      redirectChain,
      contentType: result.headers['content-type'] || 'text/html',
      contentLength: result.body.length,
    };
  }

  throw new Error('Unexpected end of request pipeline');
}

interface SingleRequestParams {
  url: URL;
  timeoutMs: number;
  maxBytes: number;
  userAgent: string;
}

interface SingleRequestResult {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

function executeSingleRequest(params: SingleRequestParams): Promise<SingleRequestResult> {
  return new Promise((resolve, reject) => {
    const isHttps = params.url.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      protocol: params.url.protocol,
      hostname: params.url.hostname,
      port: params.url.port ? parseInt(params.url.port, 10) : isHttps ? 443 : 80,
      path: params.url.pathname + params.url.search,
      method: 'GET',
      headers: {
        'User-Agent': params.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // avoid compressed streams to inspect raw text safely and bound memory
        'Connection': 'close',
      },
      timeout: params.timeoutMs,
    };

    const req = client.request(reqOptions, (res) => {
      const statusCode = res.statusCode || 0;
      const statusText = res.statusMessage || '';
      const headers: Record<string, string> = {};

      for (const [key, val] of Object.entries(res.headers)) {
        if (typeof val === 'string') {
          headers[key.toLowerCase()] = val;
        } else if (Array.isArray(val)) {
          headers[key.toLowerCase()] = val.join(', ');
        }
      }

      // Check content-length header if provided
      const reportedLength = parseInt(headers['content-length'] || '0', 10);
      if (reportedLength > params.maxBytes) {
        req.destroy();
        return reject(
          new Error(
            `Response size ${reportedLength} bytes exceeds limit of ${params.maxBytes} bytes`
          )
        );
      }

      let receivedBytes = 0;
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (receivedBytes > params.maxBytes) {
          req.destroy();
          return reject(
            new Error(`Response exceeded maximum size limit of ${params.maxBytes} bytes`)
          );
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        const body = fullBuffer.toString('utf-8');
        resolve({
          statusCode,
          statusText,
          headers,
          body,
        });
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${params.timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}
