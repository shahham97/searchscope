import { safeFetch } from '../security/safe-fetch';

export interface RobotsTxtRule {
  userAgent: string;
  disallows: string[];
  allows: string[];
  crawlDelay?: number;
}

export interface RobotsTxtData {
  present: boolean;
  content: string;
  sitemaps: string[];
  rules: RobotsTxtRule[];
}

export function parseRobotsTxt(content: string): RobotsTxtData {
  const lines = content.split(/\r?\n/);
  const sitemaps: string[] = [];
  const rules: RobotsTxtRule[] = [];

  let currentRule: RobotsTxtRule | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const field = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    if (field === 'sitemap') {
      if (value && !sitemaps.includes(value)) {
        sitemaps.push(value);
      }
    } else if (field === 'user-agent') {
      const ua = value.toLowerCase();
      // If previous rule has same UA, continue it, else create new
      currentRule = {
        userAgent: ua,
        disallows: [],
        allows: [],
      };
      rules.push(currentRule);
    } else if (currentRule) {
      if (field === 'disallow') {
        if (value) currentRule.disallows.push(value);
      } else if (field === 'allow') {
        if (value) currentRule.allows.push(value);
      } else if (field === 'crawl-delay') {
        const delay = parseFloat(value);
        if (!isNaN(delay)) currentRule.crawlDelay = delay;
      }
    }
  }

  return {
    present: true,
    content,
    sitemaps,
    rules,
  };
}

export function isPathAllowed(path: string, robotsData: RobotsTxtData, customAgent = 'searchscope-auditor'): boolean {
  if (!robotsData.present || robotsData.rules.length === 0) {
    return true;
  }

  // Find most specific rule for our agent or fallback to '*'
  const agentRule =
    robotsData.rules.find((r) => r.userAgent === customAgent.toLowerCase()) ||
    robotsData.rules.find((r) => r.userAgent === '*');

  if (!agentRule) {
    return true;
  }

  // Check allows first (allows take precedence if equal or longer match)
  const matchingAllow = agentRule.allows.find((prefix) => path.startsWith(prefix));
  const matchingDisallow = agentRule.disallows.find((prefix) => path.startsWith(prefix));

  if (!matchingDisallow) {
    return true;
  }

  if (matchingAllow && matchingAllow.length >= matchingDisallow.length) {
    return true;
  }

  return false;
}

export async function fetchRobotsTxt(origin: string): Promise<RobotsTxtData> {
  const robotsUrl = `${origin.replace(/\/+$/, '')}/robots.txt`;
  try {
    const res = await safeFetch(robotsUrl, { timeoutMs: 5000, maxBytes: 500000 });
    if (res.statusCode >= 200 && res.statusCode < 300 && res.body.trim()) {
      return parseRobotsTxt(res.body);
    }
  } catch {
    // Non-fatal if robots.txt does not exist or fails to fetch
  }

  return {
    present: false,
    content: '',
    sitemaps: [],
    rules: [],
  };
}
