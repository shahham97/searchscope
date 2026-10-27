import React, { useState } from 'react';
import { Check, Copy, AlertTriangle, ArrowRight, CheckCircle2, Terminal, Code2 } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { RoadmapItem } from '../types/audit';

interface RoadmapViewProps {
  roadmap: RoadmapItem[];
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ roadmap }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const phaseLabels: Record<RoadmapItem['phase'], string> = {
    immediate_technical: 'Phase 1: Immediate Technical Fixes',
    high_priority_onpage: 'Phase 2: High-Priority On-Page Fixes',
    content_expansion: 'Phase 3: Content Expansion & Trust Signals',
    aeo_geo_optimization: 'Phase 4: AEO & GEO Structured Optimization',
    long_term_strategy: 'Phase 5: Continuous Monitoring & Search Console',
  };

  const phases: RoadmapItem['phase'][] = [
    'immediate_technical',
    'high_priority_onpage',
    'content_expansion',
    'aeo_geo_optimization',
    'long_term_strategy',
  ];

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {phases.map((phase) => {
        const items = roadmap.filter((r) => r.phase === phase);
        if (items.length === 0) return null;

        const phaseIndex = phases.indexOf(phase) + 1;

        return (
          <div key={phase} className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-jet-800 pb-3">
              <span className="h-7 w-7 rounded-lg bg-cerulean text-jet-950 text-xs font-bold font-mono flex items-center justify-center shadow-glow-cerulean">
                0{phaseIndex}
              </span>
              <h3 className="text-base font-bold text-white font-orbitron tracking-wide">{phaseLabels[phase]}</h3>
              <Badge variant="informational">{items.length} Task{items.length !== 1 ? 's' : ''}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="p-5 bg-jet-900 border-jet-800 shadow-xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.impact === 'critical' ? 'critical' : item.impact === 'high' ? 'high' : 'medium'}>
                        {item.impact.toUpperCase()} IMPACT
                      </Badge>
                      <Badge variant="neutral">
                        EFFORT: {item.effort.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-slate-500">ID: {item.id}</span>
                  </div>

                  <h4 className="text-base font-bold text-white font-rajdhani tracking-wide mb-1.5">{item.title}</h4>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">{item.description}</p>

                  <div className="text-[11px] font-mono text-slate-400 bg-jet-950 p-2.5 rounded-lg border border-jet-800 mb-3 truncate">
                    <strong className="text-cerulean">Target:</strong> {item.affectedUrls.join(', ')}
                  </div>

                  {/* Code snippet if available */}
                  {item.codeSnippet && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                        <span className="flex items-center font-rajdhani">
                          <Code2 className="h-3.5 w-3.5 mr-1 text-cerulean" />
                          {item.codeSnippet.caption}
                        </span>
                        <button
                          onClick={() => handleCopy(item.id, item.codeSnippet!.code)}
                          className="inline-flex items-center text-cerulean hover:text-white font-mono text-xs transition-colors"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" /> Copy Snippet
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-jet-950 text-slate-200 border border-jet-800 rounded-lg text-[11px] font-mono overflow-x-auto custom-scrollbar">
                        <code>{item.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Validation check */}
                  <div className="flex items-start space-x-2.5 text-xs text-emerald-300 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Verification Step: </strong>
                      {item.validationCheck}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
