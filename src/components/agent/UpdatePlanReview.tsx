import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Edit3,
  ExternalLink,
  Code,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  FileCode,
  Archive,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { UpdatePlan, ChangeItem } from '@/lib/agent/types';
import {
  generateUpdatePlanMarkdown,
  generateAgentTasksMarkdown,
  generateUpdatePlanCsv,
  generateContentPack,
} from '@/lib/agent/update-plan-generator';

interface UpdatePlanReviewProps {
  plan: UpdatePlan;
  domain: string;
  onUpdatePlan: (plan: UpdatePlan) => void;
  onReRunAgent?: () => void;
}

export const UpdatePlanReview: React.FC<UpdatePlanReviewProps> = ({
  plan,
  domain,
  onUpdatePlan,
  onReRunAgent,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [previewSnippetId, setPreviewSnippetId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Status updates
  const handleStatusChange = (id: string, status: 'approved' | 'rejected' | 'proposed') => {
    const updatedChanges = plan.changes.map((c) =>
      c.id === id ? { ...c, status } : c
    );
    onUpdatePlan({ ...plan, changes: updatedChanges });
  };

  const startEdit = (item: ChangeItem) => {
    setEditingId(item.id);
    setEditText(item.proposed);
  };

  const saveEdit = (id: string) => {
    const updatedChanges = plan.changes.map((c) =>
      c.id === id ? { ...c, proposed: editText, status: 'approved' as const } : c
    );
    onUpdatePlan({ ...plan, changes: updatedChanges });
    setEditingId(null);
  };

  // Downloads
  const downloadTextFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const md = generateUpdatePlanMarkdown(plan, domain);
    downloadTextFile(`UPDATE_PLAN-${domain}.md`, md, 'text/markdown;charset=utf-8;');
  };

  const handleDownloadTasks = () => {
    const tasks = generateAgentTasksMarkdown(plan, domain);
    downloadTextFile(`AGENT_TASKS-${domain}.md`, tasks, 'text/markdown;charset=utf-8;');
  };

  const handleDownloadJson = () => {
    downloadTextFile(`update-plan-${domain}.json`, JSON.stringify(plan, null, 2), 'application/json');
  };

  const handleDownloadCsv = () => {
    const csv = generateUpdatePlanCsv(plan);
    downloadTextFile(`update-plan-${domain}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const pack = generateContentPack(plan, domain);
      for (const [filePath, content] of Object.entries(pack)) {
        zip.file(filePath, content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SearchScope-Agent-ContentPack-${domain}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error creating ZIP export:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const filteredChanges = plan.changes.filter((c) => {
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    return true;
  });

  const approvedCount = plan.changes.filter((c) => c.status === 'approved').length;
  const rejectedCount = plan.changes.filter((c) => c.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <Card className="p-6 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-neutral-900 border-purple-800/40">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="informational" className="bg-purple-900/40 text-purple-300 border-purple-700/50">
                AI Agent Update Plan Ready
              </Badge>
              <Badge variant="neutral">
                Target: {domain}
              </Badge>
              {plan.changes[0]?.whereToChange.detectedPlatform && (
                <Badge variant="informational" className="bg-blue-950 text-blue-300 border-blue-800">
                  Detected: {plan.changes[0].whereToChange.detectedPlatform.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              Executive SEO, AEO & GEO Action Roadmap
            </h2>
            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              Every change is strictly grounded in crawled page facts. Zero-hallucination guardrails active. Review, edit, approve, or export full dev patches below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50"
            >
              <Archive className="w-4 h-4 mr-1.5" />
              {isExportingZip ? 'Packaging ZIP...' : 'Download Content Pack (.ZIP)'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadTasks}>
              <Code className="w-4 h-4 mr-1.5" />
              AGENT_TASKS.md
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadMarkdown}>
              <FileText className="w-4 h-4 mr-1.5" />
              UPDATE_PLAN.md
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadCsv}>
              <Download className="w-4 h-4 mr-1.5" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadJson}>
              <FileCode className="w-4 h-4 mr-1.5" />
              JSON
            </Button>
          </div>
        </div>

        {/* High level metrics bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800">
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block font-medium">Total Updates</span>
            <span className="text-lg font-bold text-white">{plan.changes.length}</span>
          </div>
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-emerald-400 block font-medium">Approved Changes</span>
            <span className="text-lg font-bold text-emerald-300">{approvedCount}</span>
          </div>
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-amber-400 block font-medium">Facts To Confirm</span>
            <span className="text-lg font-bold text-amber-300">{plan.factsNeededFromOwner.length}</span>
          </div>
          <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-blue-400 block font-medium">QA Passed</span>
            <span className="text-lg font-bold text-blue-300">
              {plan.qaSummary.passedQa} / {plan.qaSummary.totalItems}
            </span>
          </div>
        </div>
      </Card>

      {/* Facts needed banner if any */}
      {plan.factsNeededFromOwner.length > 0 && (
        <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Zero-Hallucination Guardrail: Facts Requiring Owner Confirmation ({plan.factsNeededFromOwner.length})</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            The agent detected the following attributes are not explicitly stated in the audited pages and marked them with <code className="bg-amber-950/60 text-amber-400 px-1 py-0.5 rounded">[[CONFIRM: ...]]</code>. Please confirm these values before applying to production:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {plan.factsNeededFromOwner.map((fact, i) => (
              <span
                key={i}
                className="text-[11px] bg-neutral-900 border border-amber-800/50 text-amber-200/90 px-2.5 py-1 rounded-md"
              >
                {fact}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Site Profile & Niche Intelligence accordion/card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3">
          <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Site Profile & Brand Positioning
          </h4>
          <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
            <div>
              <span className="text-neutral-500 block">Niche & Sub-Niche:</span>
              <span className="font-semibold text-white">{plan.siteProfile.niche} ({plan.siteProfile.subNiche || 'Direct-to-Consumer'})</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Brand Voice & Tone:</span>
              <span>{plan.siteProfile.brandVoice.tone}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Verified Value Props:</span>
              <ul className="list-disc list-inside text-neutral-300 space-y-0.5 pl-1">
                {plan.siteProfile.verifiedUSPs.map((usp, idx) => (
                  <li key={idx}>{usp}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3">
          <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            Answer Engine (AEO) & Generative Search (GEO) Gaps
          </h4>
          <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
            <div>
              <span className="text-neutral-500 block">Key Search Intent Questions:</span>
              <ul className="list-disc list-inside text-neutral-300 space-y-0.5 pl-1">
                {plan.nicheInsights.commonQuestions.slice(0, 3).map((q, idx) => (
                  <li key={idx}>"{q.question}"</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-neutral-500 block">Topical Content Gaps:</span>
              <ul className="list-disc list-inside text-neutral-300 space-y-0.5 pl-1">
                {plan.nicheInsights.contentGaps.slice(0, 2).map((gap, idx) => (
                  <li key={idx}>
                    <strong className="text-white">{gap.topic}:</strong> {gap.whyNeeded}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 mr-1">Filter:</span>
          {['all', 'onpage', 'content', 'schema', 'technical'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                filterCategory === cat
                  ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-semibold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400">Priority:</span>
          {['all', 'P0', 'P1', 'P2', 'P3'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`text-xs px-2 py-0.5 rounded border ${
                filterPriority === p
                  ? 'bg-neutral-800 border-neutral-600 text-white font-semibold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Changes Backlog List */}
      <div className="space-y-4">
        {filteredChanges.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-800">
            No changes match the selected category or priority filter.
          </div>
        ) : (
          filteredChanges.map((item) => {
            const isEditing = editingId === item.id;
            const isExpanded = expandedId === item.id;
            const isSERPPreview = previewSnippetId === item.id;
            const isTitleOrDesc =
              item.whereToChange.humanReadable.includes('title') ||
              item.whereToChange.humanReadable.includes('description');

            return (
              <Card
                key={item.id}
                className={`p-5 transition-all border ${
                  item.status === 'approved'
                    ? 'border-emerald-800/40 bg-neutral-900/90'
                    : item.status === 'rejected'
                    ? 'border-neutral-800/40 opacity-60 bg-neutral-950'
                    : 'border-neutral-800 bg-neutral-900'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-neutral-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        item.priority === 'P0'
                          ? 'critical'
                          : item.priority === 'P1'
                          ? 'high'
                          : 'neutral'
                      }
                    >
                      {item.priority}
                    </Badge>
                    <Badge variant="informational" className="bg-purple-900/40 text-purple-300 border-purple-700/50">
                      {item.category.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono text-neutral-300 truncate max-w-sm">
                      {item.targetUrl}
                    </span>
                    {item.qaStatus === 'passed' ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3" /> QA Passed
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Confirm Required
                      </span>
                    )}
                  </div>

                  {/* Approve / Reject / Edit Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isTitleOrDesc && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setPreviewSnippetId(isSERPPreview ? null : item.id)
                        }
                        className="text-xs h-7 px-2"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        SERP
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => (isEditing ? saveEdit(item.id) : startEdit(item))}
                      className="text-xs h-7 px-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      {isEditing ? 'Save' : 'Edit'}
                    </Button>
                    <Button
                      variant={item.status === 'approved' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleStatusChange(item.id, 'approved')}
                      className={`text-xs h-7 px-2.5 ${
                        item.status === 'approved'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'hover:text-emerald-400'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(item.id, 'rejected')}
                      className={`text-xs h-7 px-2.5 hover:text-red-400 ${
                        item.status === 'rejected' ? 'text-red-400 border-red-800' : ''
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>

                {/* SERP Preview Simulation */}
                {isSERPPreview && (
                  <div className="my-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                      Google / AI Search SERP Snippet Preview
                    </span>
                    <div className="text-xs font-mono text-emerald-400 truncate">
                      {item.targetUrl}
                    </div>
                    <div className="text-sm font-medium text-blue-400 hover:underline cursor-pointer">
                      {item.whereToChange.humanReadable.includes('title')
                        ? item.proposed
                        : item.targetUrl}
                    </div>
                    <div className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {item.whereToChange.humanReadable.includes('description')
                        ? item.proposed
                        : item.rationale}
                    </div>
                  </div>
                )}

                {/* Where to Change: Platform Location */}
                <div className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 bg-neutral-950/40 px-3 rounded-md my-3 border border-neutral-800/60">
                  <div className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Location:</span>
                    <strong className="text-neutral-200">
                      {item.whereToChange.suggestedFilePath || item.whereToChange.humanReadable}
                    </strong>
                  </div>
                  <div>
                    <span>Action:</span>{' '}
                    <span className="text-neutral-300 font-mono text-[11px]">
                      {item.changeType.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span>Effort:</span>{' '}
                    <span className="text-neutral-300">{item.effort}</span>
                  </div>
                  <div>
                    <span>Owner:</span>{' '}
                    <span className="text-neutral-300 font-medium">{item.owner.toUpperCase()}</span>
                  </div>
                </div>

                {/* Diff Comparison */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Current */}
                    <div className="p-3 bg-red-950/10 border border-red-900/30 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">
                        Current ({item.current.length} chars)
                      </span>
                      <div className="font-mono text-neutral-300 text-xs whitespace-pre-wrap break-all leading-relaxed">
                        {item.current}
                      </div>
                    </div>

                    {/* Proposed / Editable */}
                    <div className="p-3 bg-emerald-950/10 border border-emerald-900/30 rounded-lg space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          Proposed ({item.proposed.length} chars)
                        </span>
                        {item.proposed.length >= 50 && item.proposed.length <= 65 && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            Optimal Title Length
                          </span>
                        )}
                        {item.proposed.length >= 140 && item.proposed.length <= 160 && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            Optimal Meta Length
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            className="w-full bg-neutral-950 border border-purple-500 rounded p-2 text-xs text-white font-mono focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              className="text-xs h-6 px-2"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => saveEdit(item.id)}
                              className="text-xs h-6 px-2 bg-purple-600 hover:bg-purple-500"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-neutral-200 text-xs whitespace-pre-wrap break-all leading-relaxed">
                          {item.proposed}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rationale & Source Evidence toggle */}
                  <div className="pt-2 flex justify-between items-center text-xs">
                    <p className="text-neutral-400 text-xs italic">
                      {item.rationale}
                    </p>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>{isExpanded ? 'Less' : 'Dev Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs space-y-2">
                      <div>
                        <span className="text-neutral-500 font-semibold block">Platform Implementation Instruction:</span>
                        <span className="text-neutral-300">{item.whereToChange.platformInstruction}</span>
                      </div>
                      {item.whereToChange.codeAnchor && (
                        <div>
                          <span className="text-neutral-500 font-semibold block">Code Anchor / Function:</span>
                          <code className="text-purple-300 font-mono text-[11px] block bg-neutral-900 p-1.5 rounded mt-0.5">
                            {item.whereToChange.codeAnchor}
                          </code>
                        </div>
                      )}
                      <div>
                        <span className="text-neutral-500 font-semibold block">Verification Method:</span>
                        <span className="text-neutral-300">{item.verification}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
