/**
 * Redaction and Prompt Injection Defense for SearchScope AI Agent Mode.
 */

// Common email regex
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// Common phone regex (international, US, and Australian mobile/landline)
const PHONE_REGEX =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;

// Credit card number pattern (Luhn candidate strings)
const CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

/**
 * Redacts personal identifiable information (emails, phone numbers, card numbers)
 * before text is transmitted to an external LLM.
 */
export function redactPii(text: string): string {
  if (!text) return '';
  return text
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(CC_REGEX, '[CARD_REDACTED]')
    .replace(PHONE_REGEX, (match) => {
      // Avoid redacting common year strings (e.g. 2026) or short numbers
      if (match.trim().length <= 5 || /^\d{4}$/.test(match.trim())) return match;
      return '[PHONE_REDACTED]';
    });
}

/**
 * Sanitizes untrusted text extracted from public web pages to protect against
 * prompt injection and jailbreak payloads.
 */
export function sanitizeUntrustedContent(rawContent: string, maxLength: number = 3000): string {
  if (!rawContent) return '';

  let sanitized = rawContent
    // Neutralize common prompt injection trigger phrases
    .replace(/\b(ignore previous instructions|disregard earlier prompts|new system directive)\b/gi, '[INSTRUCTION_FILTERED]')
    .replace(/\b(system prompt:|assistant:|system message:)\b/gi, '[DELIMITER_FILTERED]')
    .replace(/\b(you are now in developer mode|bypass safety guidelines)\b/gi, '[MODE_OVERRIDE_FILTERED]');

  // Redact PII
  sanitized = redactPii(sanitized);

  // Bound token length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '\n...[TRUNCATED FOR CONTEXT BUDGET]';
  }

  return sanitized;
}

/**
 * Wraps untrusted crawled content in clear boundary tags with explicit system instructions
 * that the contents must be treated as passive research data.
 */
export function wrapInUntrustedDataBoundary(label: string, content: string): string {
  const clean = sanitizeUntrustedContent(content);
  return `<untrusted_site_data label="${label}">\n${clean}\n</untrusted_site_data>`;
}

// Aliases for convenient importing
export const redactPII = redactPii;
export const sanitizePromptInput = sanitizeUntrustedContent;

