import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight, Terminal, ShieldCheck } from 'lucide-react';
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
              className="text-xs"
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
          <Card className="p-6 bg-gradient-to-r from-purple-950/30 via-neutral-900 to-neutral-900 border-purple-800/40">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="informational" className="bg-purple-900/40 text-purple-300 border-purple-700/50">
                    Autonomous Mode
                  </Badge>
                  <span className="text-xs text-neutral-400">Strict Bring-Your-Own-Key (BYOK)</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  SearchScope Autonomous AI Agent
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Go beyond reporting. SearchScope AI Agent profiles your brand voice and niche, solves content and schema gaps, enforces zero-hallucination guardrails, and outputs dev-ready code patches for your platform.
                </p>
              </div>

              <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl text-center shrink-0">
                <span className="text-[11px] text-purple-300 block font-semibold">Crawl Analyzed</span>
                <span className="text-lg font-bold text-white">{report.pages.length} Pages</span>
                <span className="text-[10px] text-neutral-400 block">{report.findings.length} Findings</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  Brand Facts: <strong>{brandFacts.tradingName}</strong> (
                  {brandFacts.countryOfOrigin.isOriginVerified ? 'Origin Verified ✓' : 'Origin Awaiting Verification ⚠️'}
                  )
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrandFactsModal(true)}
                className="text-xs border-purple-700/60 text-purple-200 hover:bg-purple-950/40"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-purple-300" />
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
            <Card className="p-6 bg-neutral-900 border-purple-800/50 space-y-5 animate-pulse-border">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <h4 className="text-sm font-semibold text-white">
                    Agent Pipeline Running autonomously...
                  </h4>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
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
                          ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                          : isCurrent
                          ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                          : isFailed
                          ? 'bg-red-950/30 border-red-800 text-red-300'
                          : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{s.id}</span>
                        {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {isCurrent && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
                      </div>
                      <span className="font-semibold block text-[11px] truncate">
                        {s.name.replace(/Stage .: /, '')}
                      </span>
                      <span className="text-[10px] text-neutral-400 block truncate mt-0.5">
                        {log?.message || s.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live console message */}
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                  <Terminal className="w-3 h-3" />
                  <span>Agent Execution Log</span>
                </div>
                {stageLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-purple-400">[{log.stage}]</span>
                    <span>{log.message}</span>
                    {log.durationMs && (
                      <span className="text-neutral-500 text-[10px]">({log.durationMs}ms)</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white block">Agent Pipeline Error</span>
                <p>{error}</p>
                <p className="text-neutral-400 text-[11px] pt-1">
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
