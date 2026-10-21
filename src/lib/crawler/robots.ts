import { safeFetch } from '../security/safe-fetch';

export interface RobotsTxtRule {
  userAgent: string;
  disallows: string[];
  allows: string[];
  crawlDelay?: number;
}

export interface AiBotStatus {
  bot: string;
  allowed: boolean;
  ruleSnippet?: string;
}

export interface RobotsTxtData {
  present: boolean;
  content: string;
  sitemaps: string[];
  rules: RobotsTxtRule[];
  aiBotsAudit: AiBotStatus[];
}

export const MONITORED_AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
];

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

  // Audit AI Crawler permissions on root '/'
  const aiBotsAudit: AiBotStatus[] = MONITORED_AI_BOTS.map((bot) => {
    const isAllowed = isPathAllowed('/', { present: true, rules }, bot);
    const matchingRule = rules.find((r) => r.userAgent === bot.toLowerCase());
    return {
      bot,
      allowed: isAllowed,
      ruleSnippet: matchingRule ? `User-agent: ${matchingRule.userAgent}` : 'Default (* rule)',
    };
  });

  return {
    present: true,
    content,
    sitemaps,
    rules,
    aiBotsAudit,
  };
}

export function isPathAllowed(
  path: string,
  robotsData: { present: boolean; rules: RobotsTxtRule[] },
  customAgent: string = 'searchscope-auditor'
): boolean {
  if (!robotsData.present || robotsData.rules.length === 0) {
    return true;
  }

  const agent = customAgent.toLowerCase();
  // Find exact agent rule, prefix match, or fallback to '*'
  const agentRule =
    robotsData.rules.find((r) => r.userAgent === agent) ||
    robotsData.rules.find((r) => r.userAgent !== '*' && agent.startsWith(r.userAgent)) ||
    robotsData.rules.find((r) => r.userAgent === '*');

  if (!agentRule) {
    return true;
  }

  // Check allows first (longest match wins in RFC 9309)
  const matchingAllow = agentRule.allows
    .filter((prefix) => path.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];

  const matchingDisallow = agentRule.disallows
    .filter((prefix) => path.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];

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
    // Non-fatal if robots.txt does not exist or fails
  }

  return {
    present: false,
    content: '',
    sitemaps: [],
    rules: [],
    aiBotsAudit: MONITORED_AI_BOTS.map((bot) => ({
      bot,
      allowed: true,
      ruleSnippet: 'No robots.txt present (Allowed by default)',
    })),
  };
}
