import React, { useState } from 'react';
import { ShieldCheck, Download, Upload, Check, AlertTriangle, X, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BrandFacts } from '../../lib/agent/brand-facts';

interface BrandFactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandFacts: BrandFacts;
  onSave: (updated: BrandFacts) => void;
}

export const BrandFactsModal: React.FC<BrandFactsModalProps> = ({
  isOpen,
  onClose,
  brandFacts,
  onSave,
}) => {
  const [facts, setFacts] = useState<BrandFacts>(brandFacts);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(brandFacts, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (jsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        setFacts(parsed);
        onSave(parsed);
        onClose();
      } catch (err: any) {
        setJsonError(`Invalid JSON: ${err.message}`);
      }
    } else {
      onSave(facts);
      onClose();
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(facts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-facts-${facts.tradingName || 'site'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setFacts(parsed);
        setJsonText(JSON.stringify(parsed, null, 2));
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`Failed to parse imported JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Brand Facts & Compliance Guardrails">
      <div className="space-y-6 text-xs text-slate-700 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/60 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-indigo-950">Verified Grounding Layer for AI Agent</h4>
            <p className="text-slate-600 leading-relaxed">
              The AI Agent references these facts to prevent false claims. If country of origin, longevity, or ingredient purity is unverified, the Agent is strictly blocked from making unsubstantiated claims.
            </p>
          </div>
        </div>

        {/* Tab switch between Form and Raw JSON */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setJsonMode(false)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                !jsonMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Structured Form
            </button>
            <button
              onClick={() => {
                setJsonText(JSON.stringify(facts, null, 2));
                setJsonMode(true);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                jsonMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Raw JSON Editor
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
              <Upload className="w-3.5 h-3.5" />
              Import
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {jsonMode ? (
          <div className="space-y-2">
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
              }}
              rows={16}
              className="w-full font-mono text-[11px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-900 text-slate-100"
            />
            {jsonError && <p className="text-rose-600 font-semibold">{jsonError}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Legal Entity & Trading */}
            <div className="space-y-3">
              <h5 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
                1. Legal & Trading Identity
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Trading / Brand Name
                  </label>
                  <input
                    type="text"
                    value={facts.tradingName || ''}
                    onChange={(e) => setFacts({ ...facts, tradingName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Legal Registered Business Name
                  </label>
                  <input
                    type="text"
                    value={facts.legalBusinessName || ''}
                    placeholder="e.g. KingShyer Pty Ltd"
                    onChange={(e) => setFacts({ ...facts, legalBusinessName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Country of Origin & Substantiation */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h5 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
                  2. Country of Origin & Location
                </h5>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facts.countryOfOrigin.isOriginVerified}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        countryOfOrigin: { ...facts.countryOfOrigin, isOriginVerified: e.target.checked },
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-900">Origin Certified / Verified</span>
                </label>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Manufacturing / Bottling Location
                  </label>
                  <input
                    type="text"
                    value={facts.countryOfOrigin.manufacturingLocation || ''}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        countryOfOrigin: { ...facts.countryOfOrigin, manufacturingLocation: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Dispatch Location
                  </label>
                  <input
                    type="text"
                    value={facts.countryOfOrigin.dispatchLocation || ''}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        countryOfOrigin: { ...facts.countryOfOrigin, dispatchLocation: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 3. Product Specifications & Wear Durations */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h5 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
                3. Formulation & Product Claims
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={facts.productClaims.alcoholFree}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        productClaims: { ...facts.productClaims, alcoholFree: e.target.checked },
                      })
                    }
                  />
                  <span>Alcohol-Free</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={facts.productClaims.crueltyFree}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        productClaims: { ...facts.productClaims, crueltyFree: e.target.checked },
                      })
                    }
                  />
                  <span>Cruelty-Free</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={facts.productClaims.vegan}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        productClaims: { ...facts.productClaims, vegan: e.target.checked },
                      })
                    }
                  />
                  <span>Vegan</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={facts.productClaims.pureAttarOil}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        productClaims: { ...facts.productClaims, pureAttarOil: e.target.checked },
                      })
                    }
                  />
                  <span>Pure Perfume Oil</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tested Wear Duration (Hours) — leave blank if not laboratory/panel tested
                </label>
                <input
                  type="number"
                  value={facts.productClaims.testedWearDurationHours || ''}
                  placeholder="e.g. 12 (leave blank if unverified)"
                  onChange={(e) =>
                    setFacts({
                      ...facts,
                      productClaims: {
                        ...facts.productClaims,
                        testedWearDurationHours: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* 4. Review Policy Baseline */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h5 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
                4. Customer Review Integrity Baseline
              </h5>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={facts.reviewPolicy.verifiedBuyersOnly}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        reviewPolicy: { ...facts.reviewPolicy, verifiedBuyersOnly: e.target.checked },
                      })
                    }
                  />
                  <span>Published reviews originate exclusively from verified purchasing customers</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={facts.reviewPolicy.noEmployeeOrFamilyReviews}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        reviewPolicy: { ...facts.reviewPolicy, noEmployeeOrFamilyReviews: e.target.checked },
                      })
                    }
                  />
                  <span>Strict policy prohibiting undisclosed reviews from store staff, founders, or family</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save & Apply Brand Facts
          </Button>
        </div>
      </div>
    </Modal>
  );
};
