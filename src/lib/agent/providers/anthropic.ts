import { LLMProvider, LLMMessage, LLMCallOptions, LLMResponse } from './llm-provider';

export class AnthropicProvider implements LLMProvider {
  type = 'anthropic' as const;

  async testConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'Anthropic API key is required.' };
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          message: data?.error?.message || `HTTP ${res.status}: Failed to authenticate with Anthropic`,
        };
      }

      return { success: true, message: 'Anthropic Claude API connection verified.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to Anthropic.' };
    }
  }

  async call(
    messages: LLMMessage[],
    options: LLMCallOptions = {},
    apiKey?: string,
    _baseUrl?: string,
    model: string = 'claude-3-5-sonnet-20241022'
  ): Promise<LLMResponse> {
    if (!apiKey) {
      throw new Error('Anthropic API key is missing.');
    }

    const systemMsg = messages.find((m) => m.role === 'system');
    const userAndAssistantMsgs = messages.filter((m) => m.role !== 'system');

    const payload: any = {
      model,
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.2,
      messages: userAndAssistantMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMsg) {
      payload.system = systemMsg.content;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(
        `Anthropic Error (HTTP ${res.status}): ${errorJson?.error?.message || 'Unknown Anthropic error'}`
      );
    }

    const data = await res.json();
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    const content = textBlock?.text || '';

    return {
      content,
      tokensUsed: data.usage
        ? {
            prompt: data.usage.input_tokens || 0,
            completion: data.usage.output_tokens || 0,
            total: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
        : undefined,
      model,
      provider: this.type,
    };
  }
}
