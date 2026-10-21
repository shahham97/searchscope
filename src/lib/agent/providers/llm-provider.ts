import { LLMProviderType } from '../types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  content: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  provider: LLMProviderType;
}

export interface LLMProvider {
  type: LLMProviderType;
  testConnection(apiKey?: string, baseUrl?: string): Promise<{ success: boolean; message: string }>;
  call(
    messages: LLMMessage[],
    options?: LLMCallOptions,
    apiKey?: string,
    baseUrl?: string,
    model?: string
  ): Promise<LLMResponse>;
}
