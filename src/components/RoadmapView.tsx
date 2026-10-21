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

        return (
          <div key={phase} className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {phases.indexOf(phase) + 1}
              </span>
              <h3 className="text-base font-bold text-slate-900">{phaseLabels[phase]}</h3>
              <Badge variant="neutral">{items.length} Task{items.length !== 1 ? 's' : ''}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="p-5 bg-white border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.impact === 'critical' ? 'critical' : item.impact === 'high' ? 'high' : 'medium'}>
                        {item.impact.toUpperCase()} IMPACT
                      </Badge>
                      <Badge variant="neutral">
                        EFFORT: {item.effort.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-slate-400">ID: {item.id}</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-600 mb-3">{item.description}</p>

                  <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3 truncate">
                    <strong>Target:</strong> {item.affectedUrls.join(', ')}
                  </div>

                  {/* Code snippet if available */}
                  {item.codeSnippet && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span className="flex items-center">
                          <Code2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                          {item.codeSnippet.caption}
                        </span>
                        <button
                          onClick={() => handleCopy(item.id, item.codeSnippet!.code)}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" /> Copy Snippet
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
                        <code>{item.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Validation check */}
                  <div className="flex items-start space-x-2 text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Verification Step: </strong>
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
