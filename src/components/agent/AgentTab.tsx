import React, { useState } from 'react';
import { Cpu, Loader2, CheckCircle2, AlertCircle, ArrowRight, Terminal, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuditReport } from '@/types/audit';
import { AgentConfig, AgentStageLog, UpdatePlan } from '@/lib/agent/types';
import { runAgentPipeline } from '@/lib/agent/stages/pipeline-orchestrator';
import { LLMMessage, LLMResponse } from '@/lib/agent/providers/llm-provider';
import { AgentConfigPanel } from './AgentConfigPanel';
import { AgentConsentModal } from './AgentConsentModal';
import { UpdatePlanReview } from './UpdatePlanReview';
import { BrandFactsModal } from './BrandFactsModal';
import { seedBrandFactsFromAudit, BrandFacts } from '../../lib/agent/brand-facts';

interface AgentTabProps {
  report: AuditReport;
}

export const AgentTab: React.FC<AgentTabProps> = ({ report }) => {
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [showBrandFactsModal, setShowBrandFactsModal] = useState<boolean>(false);
  const [brandFacts, setBrandFacts] = useState<BrandFacts>(() => seedBrandFactsFromAudit(report));
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [stageLogs, setStageLogs] = useState<AgentStageLog[]>([]);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [updatePlan, setUpdatePlan] = useState<UpdatePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AgentConfig>({
    provider: 'gemini',
    apiKey: '',
    scope: 'all',
    toneStrictness: 'balanced',
    aiCrawlerPolicy: 'allow_all',
  });

  const handleOpenLaunch = () => {
    if (!hasConsented) {
      setShowConsentModal(true);
    } else {
      executeAgent();
    }
  };

  const handleConfirmConsent = () => {
    setHasConsented(true);
    setShowConsentModal(false);
    executeAgent();
  };

  const executeAgent = async () => {
    setIsLaunching(true);
    setError(null);
    setStageLogs([]);
    setActiveStage('A');

    // Custom caller that routes prompts through our secure transient proxy route
    const customCaller = async (
      messages: LLMMessage[],
      options?: { jsonMode?: boolean; temperature?: number }
    ): Promise<LLMResponse> => {
      const res = await fetch('/api/agent/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          messages,
          options,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `LLM Proxy call failed with status ${res.status}`);
      }

      return res.json();
    };

    try {
      const plan = await runAgentPipeline({
        config,
        auditResult: report,
        customCaller,
        onProgress: (log) => {
          setActiveStage(log.stage);
          setStageLogs((prev) => {
            const existingIdx = prev.findIndex((l) => l.stage === log.stage);
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = log;
              return updated;
            }
            return [...prev, log];
          });
        },
      });

      setUpdatePlan(plan);
    } catch (err: any) {
      console.error('Agent execution failed:', err);
      setError(err.message || 'An error occurred during agent execution.');
    } finally {
      setIsLaunching(false);
      setActiveStage(null);
    }
  };

  const STAGES = [
    { id: 'A', name: 'Stage A: Site Profiling', desc: 'Brand voice, niche, target audience, USPs' },
    { id: 'B', name: 'Stage B: Niche Insights', desc: 'Topic clusters, content gaps, search intent questions' },
    { id: 'C', name: 'Stage C: Prioritization', desc: 'Impact × Confidence ÷ Effort scoring' },
    { id: 'D', name: 'Stage D: Content & Patches', desc: 'Metadata, direct answer paragraphs, JSON-LD, diffs' },
    { id: 'E', name: 'Stage E: Guardrails QA', desc: 'Zero-hallucination check, length check, banned claims' },
  ];

  return (
    <div className="space-y-6">
      {/* If an update plan is ready, render the review component */}
      {updatePlan ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUpdatePlan(null)}
              className="text-xs bg-jet-800 border-jet-700 text-slate-200 hover:text-white"
            >
              Modify Agent Config & Re-Run
            </Button>
          </div>
          <UpdatePlanReview
            plan={updatePlan}
            domain={report.targetDomain}
            onUpdatePlan={setUpdatePlan}
            onReRunAgent={() => setUpdatePlan(null)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Intro Card */}
          <Card className="p-4 sm:p-6 bg-jet-950 border-jet-800 text-slate-100 shadow-glow-rose relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-neon/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div className="space-y-1.5 max-w-2xl min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="critical">
                    Autonomous Code & Content Agent
                  </Badge>
                  <span className="text-[11px] sm:text-xs text-cerulean font-mono">Strict Bring-Your-Own-Key (BYOK)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white font-orbitron tracking-wide">
                  SearchScope Developer & SEO Agent
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Go beyond reporting. SearchScope AI Agent profiles brand voice and niche context, resolves schema gaps, generates platform-native Next.js code diffs, and strictly enforces zero-hallucination guardrails.
                </p>
              </div>

              <div className="p-3.5 bg-jet-900 border border-jet-800 rounded-xl text-center shrink-0">
                <span className="text-[11px] text-slate-400 block font-semibold font-rajdhani">Crawl Analyzed</span>
                <span className="text-base sm:text-lg font-bold text-white font-mono">{report.pages.length} Pages</span>
                <span className="text-[10px] text-cerulean block font-mono">{report.findings.length} Findings</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-jet-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="break-words">
                  Brand Facts: <strong className="text-white">{brandFacts.tradingName}</strong> (
                  {brandFacts.countryOfOrigin.isOriginVerified ? (
                    <span className="text-emerald-400 font-mono">Origin Verified ✓</span>
                  ) : (
                    <span className="text-amber-400 font-mono">Origin Awaiting Verification ⚠️</span>
                  )}
                  )
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrandFactsModal(true)}
                className="w-full sm:w-auto text-xs border-jet-700 bg-jet-900 text-slate-200 hover:text-white hover:border-cerulean/50 min-h-[44px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-cerulean" />
                Configure Brand Facts & Legal Guardrails
              </Button>
            </div>
          </Card>

          {/* Config Panel */}
          <AgentConfigPanel
            config={config}
            onChange={setConfig}
            onLaunch={handleOpenLaunch}
            isLaunching={isLaunching}
          />

          {/* Active execution logs */}
          {isLaunching && (
            <Card className="p-6 bg-jet-950 border-jet-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-jet-800">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-5 h-5 text-neon animate-spin" />
                  <h4 className="text-sm font-semibold text-white font-orbitron">
                    Agent Pipeline Running autonomously...
                  </h4>
                </div>
                <span className="text-xs text-cerulean font-mono">
                  Target: {report.targetDomain}
                </span>
              </div>

              {/* Progress Stage Tracker */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                {STAGES.map((s) => {
                  const log = stageLogs.find((l) => l.stage === s.id);
                  const isCurrent = activeStage === s.id;
                  const isComplete = log?.status === 'completed';
                  const isFailed = log?.status === 'failed';

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border text-xs transition-all ${
                        isComplete
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : isCurrent
                          ? 'bg-jet-900 border-cerulean text-white shadow-glow-cerulean'
                          : isFailed
                          ? 'bg-rose-950/40 border-neon/50 text-neon'
                          : 'bg-jet-900/60 border-jet-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold font-mono">{s.id}</span>
                        {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {isCurrent && <Loader2 className="w-3.5 h-3.5 text-cerulean animate-spin" />}
                      </div>
                      <span className="font-semibold block text-[11px] truncate font-rajdhani">
                        {s.name.replace(/Stage .: /, '')}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {log?.message || s.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live console message */}
              <div className="bg-jet-950 p-3 rounded-lg border border-jet-800 font-mono text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-cerulean text-[11px]">
                  <Terminal className="w-3 h-3" />
                  <span>Agent Execution Log</span>
                </div>
                {stageLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cerulean">[{log.stage}]</span>
                    <span>{log.message}</span>
                    {log.durationMs && (
                      <span className="text-slate-500 text-[10px]">({log.durationMs}ms)</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-neon/50 rounded-xl text-xs text-neon flex items-start gap-3 shadow-glow-rose">
              <AlertCircle className="w-5 h-5 text-neon shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white block font-orbitron">Agent Pipeline Error</span>
                <p className="text-rose-200">{error}</p>
                <p className="text-slate-400 text-[11px] pt-1">
                  Tip: You can test with "Mock Provider (Offline)" to verify the entire pipeline without an API key or network connection.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consent Modal */}
      <AgentConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConfirmConsent}
      />

      {/* Brand Facts & Compliance Modal */}
      <BrandFactsModal
        isOpen={showBrandFactsModal}
        onClose={() => setShowBrandFactsModal(false)}
        brandFacts={brandFacts}
        onSave={setBrandFacts}
      />
    </div>
  );
};
