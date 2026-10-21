import { AuditReport } from '@/types/audit';
import { AgentConfig, AgentStageLog, UpdatePlan } from '../types';
import { getProvider } from '../providers';
import { LLMMessage, LLMResponse } from '../providers/llm-provider';
import { runStageASiteProfile } from './stage-a-site-profile';
import { runStageBNicheInsights } from './stage-b-niche-insights';
import { runStageCPrioritization } from './stage-c-prioritization';
import { runStageDContentGenerators } from './stage-d-content-generators';
import { runStageEGuardrails } from './stage-e-guardrails';

export interface RunAgentOptions {
  config: AgentConfig;
  auditResult: AuditReport;
  onProgress?: (log: AgentStageLog) => void;
  /** Optional custom caller, e.g. when executing from browser via proxy API */
  customCaller?: (messages: LLMMessage[], options?: { jsonMode?: boolean; temperature?: number }) => Promise<LLMResponse>;
}

export async function runAgentPipeline({
  config,
  auditResult,
  onProgress,
  customCaller,
}: RunAgentOptions): Promise<UpdatePlan> {
  const domain = auditResult.targetDomain || (auditResult as any).domain || 'example.com';
  const pages = auditResult.pages as any[];
  const findings = auditResult.findings as any[];

  // Set up LLM caller
  const callLLM = customCaller || (async (messages: LLMMessage[], options?: { jsonMode?: boolean; temperature?: number }) => {
    const provider = getProvider(config.provider);
    return provider.call(
      messages,
      options,
      config.apiKey,
      config.baseUrl,
      config.model
    );
  });

  const notify = (stage: 'A' | 'B' | 'C' | 'D' | 'E', label: string, status: 'running' | 'completed' | 'failed', message: string, durationMs?: number) => {
    if (onProgress) {
      onProgress({
        stage,
        label,
        status,
        message,
        durationMs,
      });
    }
  };

  // --- STAGE A: Site Profile ---
  notify('A', 'Site Profiling', 'running', 'Analyzing domain, niche, brand voice, and value propositions...');
  const startA = Date.now();
  let siteProfile;
  try {
    siteProfile = await runStageASiteProfile(pages, findings, domain, config, callLLM);
    notify('A', 'Site Profiling', 'completed', `Identified niche "${siteProfile.niche}" (${siteProfile.pricePositioning})`, Date.now() - startA);
  } catch (err: any) {
    notify('A', 'Site Profiling', 'failed', `Error: ${err.message}`);
    throw err;
  }

  // --- STAGE B: Niche Insights ---
  notify('B', 'Niche Insights', 'running', 'Discovering topic clusters, content gaps, and search intent...');
  const startB = Date.now();
  let nicheInsights;
  try {
    nicheInsights = await runStageBNicheInsights(siteProfile, pages, config, callLLM);
    notify('B', 'Niche Insights', 'completed', `Discovered ${nicheInsights.topicClusters.length} topic clusters and ${nicheInsights.contentGaps.length} content gaps`, Date.now() - startB);
  } catch (err: any) {
    notify('B', 'Niche Insights', 'failed', `Error: ${err.message}`);
    throw err;
  }

  // --- STAGE C: Prioritization ---
  notify('C', 'Prioritization', 'running', `Scoring findings by impact × confidence ÷ effort (Scope: ${config.scope})...`);
  const startC = Date.now();
  const prioritized = runStageCPrioritization(findings, pages, siteProfile, config);
  notify('C', 'Prioritization', 'completed', `Prioritized ${prioritized.length} issues into P0-P3 backlogs`, Date.now() - startC);

  // --- STAGE D: Content & Code Generation ---
  notify('D', 'Content Generation', 'running', 'Generating grounded metadata, direct answers, and platform code patches...');
  const startD = Date.now();
  let stageDResult;
  try {
    stageDResult = await runStageDContentGenerators(prioritized, siteProfile, nicheInsights, pages, config, callLLM);
    notify('D', 'Content Generation', 'completed', `Generated ${stageDResult.changes.length} change items & ${stageDResult.newContentBriefs.length} content briefs`, Date.now() - startD);
  } catch (err: any) {
    notify('D', 'Content Generation', 'failed', `Error: ${err.message}`);
    throw err;
  }

  // --- STAGE E: Guardrails QA ---
  notify('E', 'Guardrails QA', 'running', 'Verifying character counts, zero-hallucinations, and banned claims...');
  const startE = Date.now();
  const qaResult = runStageEGuardrails(stageDResult.changes, siteProfile);
  notify('E', 'Guardrails QA', 'completed', `QA Passed: ${qaResult.qaSummary.passedQa}/${qaResult.qaSummary.totalItems} items. Flagged ${qaResult.factsNeededFromOwner.length} owner facts needed.`, Date.now() - startE);

  const finalPlan: UpdatePlan = {
    siteProfile,
    nicheInsights,
    changes: qaResult.sanitizedChanges,
    siteWideChanges: stageDResult.siteWideChanges,
    newContentBriefs: stageDResult.newContentBriefs,
    factsNeededFromOwner: qaResult.factsNeededFromOwner,
    qaSummary: qaResult.qaSummary,
  };

  return finalPlan;
}
