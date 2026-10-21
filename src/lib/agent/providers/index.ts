import { LLMProviderType } from '../types';
import { LLMProvider } from './llm-provider';
import { GeminiProvider } from './gemini';
import { OpenAICompatibleProvider } from './openai-compatible';
import { AnthropicProvider } from './anthropic';
import { MockProvider } from './mock-provider';

const providers: Record<LLMProviderType, LLMProvider> = {
  gemini: new GeminiProvider(),
  groq: new OpenAICompatibleProvider('groq'),
  openrouter: new OpenAICompatibleProvider('openrouter'),
  anthropic: new AnthropicProvider(),
  mistral: new OpenAICompatibleProvider('mistral'),
  openai_compatible: new OpenAICompatibleProvider('openai_compatible'),
  ollama: new OpenAICompatibleProvider('ollama'),
  mock: new MockProvider(),
};

export function getProvider(type: LLMProviderType): LLMProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unsupported LLM provider: ${type}`);
  }
  return provider;
}

export * from './llm-provider';
export * from './gemini';
export * from './openai-compatible';
export * from './anthropic';
export * from './mock-provider';
