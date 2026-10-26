import React from 'react';
import { 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ChevronRight, 
  ArrowUpRight, 
  ShieldAlert, 
  UploadCloud, 
  Sparkles,
  PieChart as PieIcon,
  BarChart2
} from 'lucide-react';
import { DisputeCase } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/finance';

interface DashboardProps {
  activeCase: DisputeCase;
  onNavigate: (section: any) => void;
  onLoadScenario: (scenario: 'A' | 'B' | 'C') => void;
  onRunWorkflow: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeCase,
  onNavigate,
  onLoadScenario,
  onRunWorkflow
}) => {
  // Dynamic Calculations from state
  const summaries = activeCase.financialSummaries || [];
  const totalInvoices = summaries.length;
  
  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  let partialPaidCount = 0;

  // Ageing breakdown buckets
  const ageing = {
    current: 0, // 0 days overdue (not yet due)
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0
  };

  summaries.forEach((s) => {
    totalBilled += s.totalAmount;
    totalPaid += s.confirmedPaymentsAllocated;
    totalOutstanding += s.outstandingPrincipal;

    if (s.isOverdue && s.outstandingPrincipal > 0) {
      totalOverdue += s.outstandingPrincipal;
      overdueCount += 1;

      if (s.overdueDays <= 30) ageing.days1_30 += s.outstandingPrincipal;
      else if (s.overdueDays <= 60) ageing.days31_60 += s.outstandingPrincipal;
      else if (s.overdueDays <= 90) ageing.days61_90 += s.outstandingPrincipal;
      else ageing.days90Plus += s.outstandingPrincipal;
    } else {
      ageing.current += s.outstandingPrincipal;
    }

    if (s.paymentStatus === 'partially_paid') {
      partialPaidCount += 1;
    }
  });

  const docsAwaitingVerification = activeCase.documents.filter(d => !d.isVerifiedByUser).length;
  const unresolvedDiscrepancies = activeCase.discrepancies.filter(d => !d.isResolved).length;
  const isAwaitingApproval = activeCase.humanReview.approvalStatus === 'Draft - Pending Review';

  // Empty state if 0 documents and 0 summaries
  if (activeCase.documents.length === 0 && summaries.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Dispute Documents Loaded Yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
            DuesGuard AI extracts commercial facts, validates purchase orders, reconciles payments, and prepares dispute-ready evidence bundles for Indian MSMEs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('documents')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4 text-teal-400" />
              Upload Documents
            </button>
            <button
              onClick={() => onLoadScenario('A')}
              className="px-5 py-2.5 text-xs font-semibold text-slate-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              Load Synthetic Demo (Scenario A)
            </button>
            <button
              onClick={() => onLoadScenario('C')}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
            >
              Load PO Discrepancy (Scenario C)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Hero Metric Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Outstanding Principal */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Outstanding Principal</span>
            <span className="p-1 rounded bg-red-50 text-red-600">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mb-1">
            {formatINR(totalOutstanding)}
          </div>
          <div className="text-xs text-slate-500">
            Across {totalInvoices} invoice(s)
          </div>
        </div>

        {/* Metric 2: Total Overdue Principal */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Overdue Principal</span>
            <span className="p-1 rounded bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-red-600 font-mono tabular-nums mb-1">
            {formatINR(totalOverdue)}
          </div>
          <div className="text-xs text-slate-500">
            {overdueCount} overdue invoice(s) as of {activeCase.asOfDate}
          </div>
        </div>

        {/* Metric 3: Confirmed Payments Allocated */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Confirmed Payments</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mb-1">
            {formatINR(totalPaid)}
          </div>
          <div className="text-xs text-slate-500">
            {partialPaidCount} partially settled invoice(s)
          </div>
        </div>

        {/* Metric 4: Discrepancies & Attention Items */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Attention Items</span>
            <span className="p-1 rounded bg-red-50 text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mb-1">
            {unresolvedDiscrepancies}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className={unresolvedDiscrepancies > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
              {unresolvedDiscrepancies > 0 ? 'Unresolved variance' : 'All validated'}
            </span>
            <span>·</span>
            <span>{docsAwaitingVerification} unverified doc(s)</span>
          </div>
        </div>
      </div>

      {/* Workflow Progress Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Agentic Workflow Pipeline</h3>
            <p className="text-xs text-slate-500">
              State-machine progress across the four analytical agents and human sign-off gate.
            </p>
          </div>
          <button
            onClick={() => onNavigate('workflow')}
            className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <span>View Execution Graph</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5-Stage Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: 'extraction' as const, label: '1. Extraction Agent', desc: `${activeCase.documents.length} docs processed` },
            { id: 'validation' as const, label: '2. Validation Agent', desc: `${unresolvedDiscrepancies} discrepancies` },
            { id: 'evidence' as const, label: '3. Evidence Agent', desc: activeCase.evidenceAnalysis?.readinessCategory || 'Pending analysis' },
            { id: 'report' as const, label: '4. Report Agent', desc: activeCase.reportDraft ? 'Draft ready' : 'Not generated' },
            { id: 'human_approval' as const, label: '5. Human Approval', desc: activeCase.humanReview.approvalStatus }
          ].map((st) => {
            const isCompleted = activeCase.stageLogs[st.id]?.status === 'completed';
            const isNeedsReview = activeCase.stageLogs[st.id]?.status === 'needs_review';
            const isCurrent = activeCase.workflowStage === st.id;

            return (
              <div 
                key={st.id}
                onClick={() => onNavigate('workflow')}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isCurrent 
                    ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500' 
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50'
                    : isNeedsReview
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-slate-100 bg-white opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-800 truncate">{st.label}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {isNeedsReview && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{st.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Split: Invoice Ageing & Outstanding by Buyer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Ageing Analysis */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Invoice Ageing Breakdown</h3>
              <p className="text-xs text-slate-500">Deterministic calculation based on As-Of Date ({activeCase.asOfDate})</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {[
              { label: 'Not Overdue (Current)', val: ageing.current, color: 'bg-emerald-500' },
              { label: '1 - 30 Days Overdue', val: ageing.days1_30, color: 'bg-amber-400' },
              { label: '31 - 60 Days Overdue', val: ageing.days31_60, color: 'bg-orange-500' },
              { label: '61 - 90 Days Overdue', val: ageing.days61_90, color: 'bg-red-400' },
              { label: '> 90 Days Overdue (Severe)', val: ageing.days90Plus, color: 'bg-red-600' }
            ].map((bucket, idx) => {
              const pct = totalOutstanding > 0 ? (bucket.val / totalOutstanding) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{bucket.label}</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatINR(bucket.val, false)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${bucket.color} transition-all duration-300`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Note: Under MSMED Act Section 15, payments beyond 45 days automatically incur statutory compound interest.
          </div>
        </div>

        {/* Counterparty & Case Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Commercial Counterparty</h3>
                <p className="text-xs text-slate-500">Defaulting Buyer Organization Details</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{activeCase.caseReference}</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 mb-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Buyer Entity:</span>
                <span className="font-semibold text-slate-900">{activeCase.buyerName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Claimant MSME:</span>
                <span className="text-slate-700">{activeCase.supplierName || 'MSME Supplier'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Invoices Claimed:</span>
                <span className="font-mono text-slate-800">{totalInvoices} invoice(s)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Readiness Status:</span>
                <span className="font-medium text-amber-700">
                  {activeCase.evidenceAnalysis?.readinessCategory || 'Ready for Review'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('dispute')}
                className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-900 mb-0.5">Dispute Dossier</div>
                <div className="text-[11px] text-slate-500">Inspect case readiness & chronology</div>
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-900 mb-0.5">Approval Gate</div>
                <div className="text-[11px] text-slate-500">
                  {isAwaitingApproval ? 'Review & Sign-off' : 'Generate Export'}
                </div>
              </button>
            </div>
          </div>

          {/* Synthetic Demo Switcher bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Quick Test Scenarios:</span>
            <div className="flex gap-2">
              <button
                onClick={() => onLoadScenario('A')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium text-slate-700"
              >
                A: Unpaid ₹1.2L
              </button>
              <button
                onClick={() => onLoadScenario('B')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium text-slate-700"
              >
                B: Partial ₹70k
              </button>
              <button
                onClick={() => onLoadScenario('C')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium text-slate-700"
              >
                C: PO Discrepancy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
