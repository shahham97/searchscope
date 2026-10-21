import { LLMProvider, LLMMessage, LLMCallOptions, LLMResponse } from './llm-provider';
import { LLMProviderType } from '../types';

export class OpenAICompatibleProvider implements LLMProvider {
  type: LLMProviderType;
  defaultBaseUrl: string;
  defaultModel: string;

  constructor(
    type: LLMProviderType = 'openai_compatible',
    defaultBaseUrl: string = 'https://api.openai.com/v1',
    defaultModel: string = 'gpt-4o-mini'
  ) {
    this.type = type;
    this.defaultBaseUrl = defaultBaseUrl;
    this.defaultModel = defaultModel;
  }

  async testConnection(apiKey?: string, baseUrl?: string): Promise<{ success: boolean; message: string }> {
    const endpoint = (baseUrl || this.defaultBaseUrl).replace(/\/+$/, '') + '/chat/completions';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: err?.error?.message || `HTTP ${res.status}: Failed connection`,
        };
      }

      return { success: true, message: `${this.type.toUpperCase()} connection verified.` };
    } catch (err: any) {
      return { success: false, message: err.message || `Failed to connect to ${this.type}` };
    }
  }

  async call(
    messages: LLMMessage[],
    options: LLMCallOptions = {},
    apiKey?: string,
    baseUrl?: string,
    model?: string
  ): Promise<LLMResponse> {
    const endpoint = (baseUrl || this.defaultBaseUrl).replace(/\/+$/, '') + '/chat/completions';
    const effectiveModel = model || this.defaultModel;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload: any = {
      model: effectiveModel,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4000,
    };

    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(
        `${this.type} Error (HTTP ${res.status}): ${errorJson?.error?.message || 'Unknown provider error'}`
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      tokensUsed: data.usage
        ? {
            prompt: data.usage.prompt_tokens || 0,
            completion: data.usage.completion_tokens || 0,
            total: data.usage.total_tokens || 0,
          }
        : undefined,
      model: effectiveModel,
      provider: this.type,
    };
  }
}
