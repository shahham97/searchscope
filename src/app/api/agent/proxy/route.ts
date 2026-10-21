import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProvider } from '@/lib/agent/providers';
import { LLMProviderType } from '@/lib/agent/types';

export const maxDuration = 60; // 60s max execution duration for Vercel functions
export const dynamic = 'force-dynamic';

const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(100000),
});

const ProxySchema = z.object({
  provider: z.enum([
    'gemini',
    'groq',
    'openrouter',
    'anthropic',
    'mistral',
    'openai_compatible',
    'ollama',
    'mock',
  ]),
  apiKey: z.string().trim().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  model: z.string().trim().optional(),
  messages: z.array(MessageSchema).min(1).max(20),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(10).max(8192).optional(),
      jsonMode: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ProxySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid proxy request payload',
          details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        },
        { status: 400 }
      );
    }

    const { provider, apiKey, baseUrl, model, messages, options } = parsed.data;

    // Check if API key is required
    if (provider !== 'mock' && provider !== 'ollama' && (!apiKey || apiKey.length < 5)) {
      return NextResponse.json(
        { error: `API Key is required for provider "${provider}".` },
        { status: 400 }
      );
    }

    const llmProvider = getProvider(provider as LLMProviderType);

    const response = await llmProvider.call(
      messages,
      options,
      apiKey,
      baseUrl || undefined,
      model || undefined
    );

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Agent Proxy Error:', message);
    return NextResponse.json(
      { error: `LLM Proxy Request failed: ${message}` },
      { status: 502 }
    );
  }
}
