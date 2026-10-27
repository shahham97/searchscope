import React from 'react';
import { ShieldCheck, Lock, Database, Server, Cpu, Globe } from 'lucide-react';
import { Modal } from './ui/Modal';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Architecture, Threat Model & Methodology"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
        {/* Section 1 */}
        <div className="flex items-start space-x-3.5 p-4 bg-jet-950 rounded-xl border border-jet-800">
          <Database className="h-5 w-5 text-cerulean shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm font-orbitron">1. Zero Persistent Database Model</h4>
            <p className="mt-1 text-slate-400">
              SearchScope does not connect to any database (no Postgres, MySQL, TiDB, Redis, or MongoDB).
              Audit results exist solely in active transient execution state and in your browser memory.
              Navigating away or clearing your session immediately discards all audit data.
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="flex items-start space-x-3.5 p-4 bg-jet-950 rounded-xl border border-jet-800">
          <Lock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm font-orbitron">2. SSRF & Rebinding Security Engine</h4>
            <p className="mt-1 text-slate-400">
              Every crawl target and redirect hop is validated at DNS resolution time:
            </p>
            <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-slate-400 font-mono text-[11px]">
              <li>Blocks IPv4 & IPv6 loopback (127.0.0.0/8, ::1)</li>
              <li>Blocks private RFC1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)</li>
              <li>Blocks Cloud Provider metadata services (169.254.169.254, metadata.google)</li>
              <li>Rejects non-standard web ports; only 80 and 443 are allowed</li>
              <li>Protects against DNS rebinding via multi-hop destination validation</li>
            </ul>
          </div>
        </div>

        {/* Section 3 */}
        <div className="flex items-start space-x-3.5 p-4 bg-jet-950 rounded-xl border border-jet-800">
          <Cpu className="h-5 w-5 text-neon shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm font-orbitron">3. Deterministic Heuristics (No Paid AI Dependencies)</h4>
            <p className="mt-1 text-slate-400">
              SearchScope executes deterministic rule engines, Schema.org parsers, readability formulas (Flesch-Kincaid),
              and structural DOM analysis. We do not transmit your page content to OpenAI, Anthropic, or external LLMs.
              The application operates completely independently of third-party API keys or paid subscriptions.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="flex items-start space-x-3.5 p-4 bg-jet-950 rounded-xl border border-jet-800">
          <Server className="h-5 w-5 text-cerulean-300 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm font-orbitron">4. Technical Operational Logs Disclosure</h4>
            <p className="mt-1 text-slate-400">
              While SearchScope does not store reports or build user profiles, hosting providers (such as Vercel)
              and intermediate edge networks inherently maintain operational HTTP access logs according to standard infrastructure reliability and security policies.
              Audited target websites will also observe our descriptive crawler user-agent:
              <br />
              <code className="text-[11px] font-mono text-cerulean bg-jet-900 border border-cerulean/30 px-2 py-0.5 rounded mt-1.5 inline-block">
                SearchScope-Auditor/1.0 (+https://searchscope.app/bot)
              </code>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
