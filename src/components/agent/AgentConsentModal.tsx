import React from 'react';
import { Shield, Key, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AgentConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AgentConsentModal: React.FC<AgentConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activate SearchScope AI Agent" maxWidth="2xl">
      <div className="space-y-5 py-2">
        <div className="flex items-center gap-3 p-4 bg-purple-950/30 border border-purple-800/40 rounded-xl">
          <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Autonomous Technical & Content Strategist</h4>
            <p className="text-xs text-neutral-400">
              Transforms raw audit findings into grounded metadata, platform code diffs, and structured update plans.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Key Architecture & Privacy Guarantees
          </h5>

          <div className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
            <Key className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 space-y-1">
              <span className="font-semibold text-white block">Strict Bring-Your-Own-Key (BYOK)</span>
              <span>
                Your API key remains exclusively in your browser's transient memory. SearchScope has no database, no persistent user tracking, and never logs keys to disk.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 space-y-1">
              <span className="font-semibold text-white block">Zero-Hallucination & PII Redaction</span>
              <span>
                Personal identifiable information (emails, phones, credentials) is automatically scrubbed before prompt submission. Any unverified fact is safely tagged with <code className="text-amber-400 bg-amber-950/40 px-1 py-0.5 rounded">[[CONFIRM: ...]]</code> for your review.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
            <Check className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 space-y-1">
              <span className="font-semibold text-white block">Free Tier & Offline Testing Supported</span>
              <span>
                You can use Google Gemini (generous free tier), Groq, local Ollama, or SearchScope's Mock Provider for testing without any API credentials.
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs text-amber-300/90 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            You retain 100% review control. The agent generates recommendations and patches for you to approve before deployment.
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} className="bg-purple-600 hover:bg-purple-500 text-white">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Continue to Agent Setup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
