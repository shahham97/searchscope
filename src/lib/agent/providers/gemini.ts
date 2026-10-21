import { LLMProvider, LLMMessage, LLMCallOptions, LLMResponse } from './llm-provider';

export class GeminiProvider implements LLMProvider {
  type = 'gemini' as const;

  async testConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'Gemini API key is required.' };
    }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with "OK"' }] }],
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          message: data?.error?.message || `HTTP ${res.status}: Failed to authenticate with Gemini API`,
        };
      }
      return { success: true, message: 'Google Gemini API connection verified.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to Gemini.' };
    }
  }

  async call(
    messages: LLMMessage[],
    options: LLMCallOptions = {},
    apiKey?: string,
    _baseUrl?: string,
    model: string = 'gemini-1.5-flash'
  ): Promise<LLMResponse> {
    if (!apiKey) {
      throw new Error('Google Gemini API key is missing.');
    }

    const systemMsg = messages.find((m) => m.role === 'system');
    const userAndAssistantMsgs = messages.filter((m) => m.role !== 'system');

    const contents = userAndAssistantMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    if (systemMsg) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    if (options.jsonMode) {
      bodyPayload.generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(
        `Gemini API Error (HTTP ${res.status}): ${errorJson?.error?.message || 'Unknown Gemini error'}`
      );
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    const usage = data.usageMetadata;

    return {
      content,
      tokensUsed: usage
        ? {
            prompt: usage.promptTokenCount || 0,
            completion: usage.candidatesTokenCount || 0,
            total: usage.totalTokenCount || 0,
          }
        : undefined,
      model,
      provider: this.type,
    };
  }
}
