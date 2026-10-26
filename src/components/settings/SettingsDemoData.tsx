import React, { useState } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Upload, 
  RotateCcw, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  FileCheck2,
  CheckCircle2,
  Database
} from 'lucide-react';
import { DisputeCase } from '../../types';
import { createScenarioA, createScenarioB, createScenarioC } from '../../data/demoData';
import { runFullPipeline } from '../../utils/stateGraph';
import { formatINR } from '../../utils/finance';

interface SettingsDemoDataProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
  onNavigate: (section: any) => void;
}

export const SettingsDemoData: React.FC<SettingsDemoDataProps> = ({
  activeCase,
  onUpdateCase,
  onNavigate
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleSelectScenario = async (scenario: 'A' | 'B' | 'C') => {
    let newCase: DisputeCase;
    if (scenario === 'A') newCase = createScenarioA(activeCase.asOfDate);
    else if (scenario === 'B') newCase = createScenarioB(activeCase.asOfDate);
    else newCase = createScenarioC(activeCase.asOfDate);

    // Automatically run the 4-agent state graph pipeline so the scenario is fully analyzed
    const processedCase = await runFullPipeline(newCase);
    onUpdateCase(processedCase);
    onNavigate('dashboard');
  };

  const handleJSONImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.caseReference || !Array.isArray(parsed.documents)) {
          throw new Error('Invalid DuesGuard case bundle structure.');
        }
        onUpdateCase(parsed);
        setImportError(null);
        onNavigate('dashboard');
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Settings & Synthetic Demo Scenarios</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Load reproducible synthetic MSME dispute scenarios, import/export case backups, or configure calculation baselines.
        </p>
      </div>

      {importError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Synthetic Scenarios Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Synthetic MSME Demonstration Scenarios (Section 13 Compliant)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario A */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded uppercase">
                  Scenario A
                </span>
                <span className="text-xs font-mono text-red-600 font-bold">₹1,20,000 Unpaid</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Unpaid Invoice</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ₹1,20,000 invoice with ₹0 payments received. Overdue 30 days. Includes signed delivery challan as Section 2(b) acceptance proof.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                <div>• Expected Outstanding: <strong>₹1,20,000</strong></div>
                <div>• Overdue Days: <strong>30 days</strong></div>
                <div>• Evidence: <strong>Invoice + Signed Challan</strong></div>
              </div>
            </div>

            <button
              onClick={() => handleSelectScenario('A')}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Load Scenario A
            </button>
          </div>

          {/* Scenario B */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded uppercase border border-teal-200">
                  Scenario B
                </span>
                <span className="text-xs font-mono text-emerald-700 font-bold">₹70,000 Balance</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Partial Payment</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ₹1,00,000 invoice with confirmed bank allocation of ₹30,000. Overdue 15 days. Outstanding principal deterministically equals ₹70,000.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                <div>• Invoice Total: <strong>₹1,00,000</strong></div>
                <div>• Confirmed Paid: <strong>₹30,000</strong></div>
                <div>• Expected Outstanding: <strong>₹70,000</strong></div>
              </div>
            </div>

            <button
              onClick={() => handleSelectScenario('B')}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Load Scenario B
            </button>
          </div>

          {/* Scenario C */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded uppercase border border-red-200">
                  Scenario C
                </span>
                <span className="text-xs font-mono text-amber-700 font-bold">₹5,000 Mismatch</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">PO Discrepancy</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Invoice billed for ₹85,000 vs Purchase Order of ₹80,000. Payment unverified. Validation agent flags the ₹5,000 unapproved rate variance.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                <div>• Invoice: <strong>₹85,000</strong> | PO: <strong>₹80,000</strong></div>
                <div>• Detected Variance: <strong>₹5,000</strong></div>
                <div>• Status: <strong>Requires Verification</strong></div>
              </div>
            </div>

            <button
              onClick={() => handleSelectScenario('C')}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Load Scenario C
            </button>
          </div>
        </div>
      </div>

      {/* JSON Import / Restore */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Database-Free State: Import Saved Case</h3>
        <p className="text-xs text-slate-500">
          Restore a previously saved DuesGuard case bundle JSON file into memory for instant session review.
        </p>

        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors">
          <Upload className="w-4 h-4 text-slate-500" />
          <span>Upload Case JSON Bundle</span>
          <input
            type="file"
            accept=".json"
            onChange={handleJSONImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Reset State Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Reset Case State</h3>
        <p className="text-xs text-slate-500">
          Clear all uploaded documents, calculations, and approvals from the current browser session.
        </p>

        {showResetConfirm ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3 text-xs">
            <div className="font-semibold text-red-900">Confirm Reset of Active Case?</div>
            <p className="text-red-700">All current in-memory documents and calculations will be erased.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const fresh = createScenarioA(activeCase.asOfDate);
                  fresh.documents = [];
                  fresh.financialSummaries = [];
                  fresh.discrepancies = [];
                  fresh.paymentAllocations = [];
                  delete fresh.reportDraft;
                  onUpdateCase(fresh);
                  setShowResetConfirm(false);
                  onNavigate('dashboard');
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md text-xs"
              >
                Yes, Reset Everything
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Active Session</span>
          </button>
        )}
      </div>
    </div>
  );
};
