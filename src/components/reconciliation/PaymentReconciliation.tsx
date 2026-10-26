import React, { useState } from 'react';
import { 
  CreditCard, 
  Check, 
  X, 
  Split, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  Plus
} from 'lucide-react';
import { DisputeCase, PaymentAllocation } from '../../types';
import { formatINR, calculateOutstandingPrincipal } from '../../utils/finance';

interface PaymentReconciliationProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
}

export const PaymentReconciliation: React.FC<PaymentReconciliationProps> = ({
  activeCase,
  onUpdateCase
}) => {
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);
  const [manualInvoiceId, setManualInvoiceId] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<number>(0);

  // Recalculates financial summaries when payment allocations change
  const recalculateBalancesWithAllocations = (newAllocations: PaymentAllocation[]): DisputeCase => {
    const confirmedByInvoice: Record<string, number> = {};
    newAllocations
      .filter(a => a.status === 'confirmed' || a.status === 'manual')
      .forEach(a => {
        confirmedByInvoice[a.targetInvoiceId] = (confirmedByInvoice[a.targetInvoiceId] || 0) + a.allocatedAmount;
      });

    const updatedSummaries = activeCase.financialSummaries.map(s => {
      const confirmedPaid = confirmedByInvoice[s.invoiceId] || 0;
      const outstandingPrincipal = calculateOutstandingPrincipal(
        s.totalAmount,
        confirmedPaid,
        s.applicableCredits,
        s.validatedAdjustments
      );

      let paymentStatus = s.paymentStatus;
      if (outstandingPrincipal <= 0) {
        paymentStatus = 'paid';
      } else if (confirmedPaid > 0) {
        paymentStatus = 'partially_paid';
      } else {
        paymentStatus = 'unpaid';
      }

      return {
        ...s,
        confirmedPaymentsAllocated: confirmedPaid,
        outstandingPrincipal,
        paymentStatus
      };
    });

    return {
      ...activeCase,
      paymentAllocations: newAllocations,
      financialSummaries: updatedSummaries
    };
  };

  const handleConfirmMatch = (allocId: string) => {
    const updated = activeCase.paymentAllocations.map(a => 
      a.id === allocId ? { ...a, status: 'confirmed' as const } : a
    );
    onUpdateCase(recalculateBalancesWithAllocations(updated));
  };

  const handleRejectMatch = (allocId: string) => {
    const updated = activeCase.paymentAllocations.map(a => 
      a.id === allocId ? { ...a, status: 'rejected' as const, allocatedAmount: 0 } : a
    );
    onUpdateCase(recalculateBalancesWithAllocations(updated));
  };

  const handleManualAllocate = () => {
    if (!manualInvoiceId || manualAmount <= 0) return;
    const targetInv = activeCase.financialSummaries.find(s => s.invoiceId === manualInvoiceId);
    if (!targetInv) return;

    const newAllocation: PaymentAllocation = {
      id: `alloc_manual_${Date.now()}`,
      paymentDocId: 'manual_entry',
      transactionRef: `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`,
      transactionDate: new Date().toISOString().split('T')[0],
      payerName: activeCase.buyerName,
      totalPaymentAmount: manualAmount,
      allocatedAmount: manualAmount,
      targetInvoiceId: targetInv.invoiceId,
      targetInvoiceNumber: targetInv.invoiceNumber,
      status: 'manual',
      matchConfidence: 1.0,
      matchExplanation: 'Manually allocated by human reviewer after reviewing bank credit entry.'
    };

    const updated = [...activeCase.paymentAllocations, newAllocation];
    onUpdateCase(recalculateBalancesWithAllocations(updated));
    setManualAmount(0);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Payment Reconciliation Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict allocation controls: Ambiguous transactions are never silently subtracted. All allocations recalculate principal deterministically.
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Zero Silent Allocations Enforced</span>
        </div>
      </div>

      {/* Main Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs font-semibold text-slate-800">
            Payment Transactions & Suggested Invoice Matches ({activeCase.paymentAllocations.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Confirmed matches deduct from principal; unconfirmed matches do not.
          </span>
        </div>

        {activeCase.paymentAllocations.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No payment receipts or bank entries recorded for this case yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Payer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Target Invoice</th>
                  <th className="py-3 px-4">Match Explanation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Reviewer Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCase.paymentAllocations.map((alloc) => {
                  const isConfirmed = alloc.status === 'confirmed' || alloc.status === 'manual';
                  const isRejected = alloc.status === 'rejected';
                  const isSuggested = alloc.status === 'suggested';

                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        {alloc.transactionDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {alloc.transactionRef}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {alloc.payerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right font-bold text-slate-900">
                        {formatINR(alloc.allocatedAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-teal-700">
                        {alloc.targetInvoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-[280px] leading-relaxed">
                        {alloc.matchExplanation}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          isConfirmed 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isRejected
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {alloc.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {!isConfirmed && (
                          <button
                            onClick={() => handleConfirmMatch(alloc.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1"
                            title="Confirm match and deduct from principal"
                          >
                            <Check className="w-3 h-3" />
                            Confirm
                          </button>
                        )}
                        {!isRejected && (
                          <button
                            onClick={() => handleRejectMatch(alloc.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded transition-colors inline-flex items-center gap-1"
                            title="Reject match and unallocate"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Allocation Tool */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Manual Payment Allocation</h3>
        <p className="text-xs text-slate-500 mb-4">
          Directly allocate an unreferenced bank credit or offline payment to a specific invoice with deterministic recalculation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-end">
          <div>
            <label className="text-slate-600 font-medium block mb-1">Target Invoice</label>
            <select
              value={manualInvoiceId}
              onChange={(e) => setManualInvoiceId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:bg-white"
            >
              <option value="">Select an invoice to allocate payment to...</option>
              {activeCase.financialSummaries.map((s) => (
                <option key={s.invoiceId} value={s.invoiceId}>
                  {s.invoiceNumber} (Total: {formatINR(s.totalAmount)}, Outstanding: {formatINR(s.outstandingPrincipal)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 font-medium block mb-1">Allocation Amount (INR)</label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={manualAmount || ''}
              onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs focus:bg-white"
            />
          </div>

          <div>
            <button
              onClick={handleManualAllocate}
              disabled={!manualInvoiceId || manualAmount <= 0}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold rounded-lg text-xs transition-colors"
            >
              Confirm Manual Allocation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
