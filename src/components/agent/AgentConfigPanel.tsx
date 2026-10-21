import React, { useState } from 'react';
import { Key, Play, Cpu, CheckCircle2, XCircle, Loader2, Globe, Shield, Sliders } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AgentConfig, LLMProviderType } from '@/lib/agent/types';

interface AgentConfigPanelProps {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
  onLaunch: () => void;
  isLaunching: boolean;
}

const PROVIDERS: { id: LLMProviderType; name: string; freeTier: boolean; desc: string }[] = [
  { id: 'gemini', name: 'Google Gemini', freeTier: true, desc: 'Generous free tier (gemini-1.5-flash / gemini-2.0-flash)' },
  { id: 'groq', name: 'Groq', freeTier: true, desc: 'Ultra-fast Llama-3 inference with free tier' },
  { id: 'openrouter', name: 'OpenRouter', freeTier: false, desc: 'Multi-model aggregator (Claude, Llama, Gemini)' },
  { id: 'anthropic', name: 'Anthropic Claude', freeTier: false, desc: 'Claude 3.5 Sonnet / Haiku' },
  { id: 'mistral', name: 'Mistral AI', freeTier: false, desc: 'Mistral Small & Large' },
  { id: 'openai_compatible', name: 'OpenAI Compatible', freeTier: false, desc: 'Any custom endpoint (OpenAI, vLLM, LMStudio)' },
  { id: 'ollama', name: 'Ollama (Local)', freeTier: true, desc: 'Local LLM on localhost:11434, no API key needed' },
  { id: 'mock', name: 'Mock Provider (Offline)', freeTier: true, desc: 'Offline testing mode without any external network call' },
];

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
  config,
  onChange,
  onLaunch,
  isLaunching,
}) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleProviderChange = (provider: LLMProviderType) => {
    onChange({
      ...config,
      provider,
      baseUrl: provider === 'ollama' ? 'http://localhost:11434' : config.baseUrl,
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agent/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connected successfully!' : 'Connection failed.'),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error testing connection',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const isKeyRequired = config.provider !== 'mock' && config.provider !== 'ollama';

  return (
    <Card className="p-6 bg-neutral-900 border-neutral-800 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            AI Agent Configuration & BYOK
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Choose your LLM provider. Keys remain strictly in transient browser state and are never saved to disk.
          </p>
        </div>
        <Badge variant={config.provider === 'mock' ? 'neutral' : 'informational'}>
          {PROVIDERS.find((p) => p.id === config.provider)?.name}
        </Badge>
      </div>

      {/* Provider Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-neutral-300 block">
          Select LLM Provider
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PROVIDERS.map((p) => {
            const isSelected = config.provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderChange(p.id)}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/80 shadow-md shadow-purple-950/50'
                    : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-semibold ${isSelected ? 'text-purple-300' : 'text-neutral-200'}`}>
                    {p.name}
                  </span>
                  {p.freeTier && (
                    <span className="text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                      Free Tier
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                  {p.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Credentials & Connection Test */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isKeyRequired ? (
          <div>
            <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between mb-1.5">
              <span>API Key</span>
              <span className="text-[11px] text-neutral-500 font-normal">Held in RAM only</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
                placeholder={`Enter your ${PROVIDERS.find((p) => p.id === config.provider)?.name} key`}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2 text-sm text-neutral-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-neutral-950/40 border border-neutral-800/60 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-neutral-400">
              <span className="font-semibold text-neutral-200 block">No API Key Required</span>
              <span>Provider runs offline or via local inference.</span>
            </div>
          </div>
        )}

        {(config.provider === 'ollama' || config.provider === 'openai_compatible') && (
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              Custom Base URL
            </label>
            <input
              type="text"
              value={config.baseUrl || ''}
              onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
              placeholder={config.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.yourprovider.com/v1'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2 text-sm text-neutral-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        )}
      </div>

      {/* Scope, Tone & Policy Tuning */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-800/60">
        <div>
          <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
            Agent Scope
          </label>
          <select
            value={config.scope}
            onChange={(e) => onChange({ ...config, scope: e.target.value as any })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
          >
            <option value="all">Full Audit (Metadata, Content, Schema)</option>
            <option value="metadata_only">Metadata Only (Titles, Descriptions)</option>
            <option value="content_only">Content Only (AEO Direct Answers, H1)</option>
            <option value="schema_only">Structured Data Only (JSON-LD)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
            Tone Strictness
          </label>
          <select
            value={config.toneStrictness}
            onChange={(e) => onChange({ ...config, toneStrictness: e.target.value as any })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
          >
            <option value="conservative">Conservative (Strict grounding, minimal edits)</option>
            <option value="balanced">Balanced (Recommended)</option>
            <option value="creative">Creative (Exploratory marketing copy)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
            AI Crawler Policy (robots.txt)
          </label>
          <select
            value={config.aiCrawlerPolicy}
            onChange={(e) => onChange({ ...config, aiCrawlerPolicy: e.target.value as any })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
          >
            <option value="allow_all">Allow All Discovery (GPTBot, ClaudeBot, etc.)</option>
            <option value="allow_search_only">Allow Search Discovery Only (Block Bulk Training)</option>
            <option value="block_training">Block Known AI Training Scrapers</option>
          </select>
        </div>
      </div>

      {/* Test Connection Result Notice */}
      {testResult && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2.5 border ${
            testResult.success
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/30 border-red-800/50 text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={handleTestConnection}
          disabled={testingConnection || isLaunching}
          size="sm"
        >
          {testingConnection ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Test Connection
            </>
          )}
        </Button>

        <Button
          variant="primary"
          onClick={onLaunch}
          disabled={isLaunching || (isKeyRequired && !config.apiKey)}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-medium px-6"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Agent Pipeline...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Launch SearchScope AI Agent
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
