import React from 'react';
import { ShieldCheck, RotateCcw, Info } from 'lucide-react';
import { Button } from './ui/Button';

interface AuditHeaderProps {
  onClearAudit?: () => void;
  hasActiveAudit: boolean;
  onOpenPrivacyModal: () => void;
}

export const AuditHeader: React.FC<AuditHeaderProps> = ({
  onClearAudit,
  hasActiveAudit,
  onOpenPrivacyModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">SearchScope</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                SEO · AEO · GEO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Privacy-first website search intelligence & audit platform
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onOpenPrivacyModal}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            <span className="hidden sm:inline">Privacy & Methodology</span>
            <span className="sm:hidden">Info</span>
          </button>

          {hasActiveAudit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAudit}
              className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset Audit
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
