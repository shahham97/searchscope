import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProvider } from '@/lib/agent/providers';
import { LLMProviderType } from '@/lib/agent/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const TestConnectionSchema = z.object({
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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TestConnectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid test connection request payload' },
        { status: 400 }
      );
    }

    const { provider, apiKey, baseUrl } = parsed.data;

    // Check if API key is required
    if (provider !== 'mock' && provider !== 'ollama' && (!apiKey || apiKey.length < 5)) {
      return NextResponse.json(
        { success: false, message: `API Key is required for provider "${provider}".` },
        { status: 400 }
      );
    }

    const llmProvider = getProvider(provider as LLMProviderType);
    const result = await llmProvider.testConnection(apiKey, baseUrl || undefined);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `Connection test failed: ${message}` },
      { status: 500 }
    );
  }
}
