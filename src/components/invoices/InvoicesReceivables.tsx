import React, { useState } from 'react';
import { 
  Receipt, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { DisputeCase, InvoiceFinancialSummary } from '../../types';
import { formatINR } from '../../utils/finance';

interface InvoicesReceivablesProps {
  activeCase: DisputeCase;
  onNavigate: (section: any) => void;
}

export const InvoicesReceivables: React.FC<InvoicesReceivablesProps> = ({
  activeCase,
  onNavigate
}) => {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
    activeCase.financialSummaries.length > 0 ? activeCase.financialSummaries[0].invoiceId : null
  );

  const summaries = activeCase.financialSummaries || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Invoices & Receivables Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic principal calculation, line-item arithmetic, and overdue status as of {activeCase.asOfDate}.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span>Active Baseline:</span>
          <strong className="text-slate-800 font-mono">{activeCase.asOfDate}</strong>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1">No Invoices in Active Case</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Upload commercial invoice documents or load a demo scenario to view receivables.
          </p>
          <button
            onClick={() => onNavigate('documents')}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Document Upload
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Buyer Entity</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Billed Total</th>
                  <th className="py-3 px-4 text-right">Confirmed Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Principal</th>
                  <th className="py-3 px-4 text-center">Overdue Days</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map((s) => {
                  const isExpanded = expandedInvoiceId === s.invoiceId;
                  const matchingDoc = activeCase.documents.find(d => d.id === s.invoiceId);
                  const invFields = matchingDoc?.extractedFields.invoice;

                  return (
                    <React.Fragment key={s.invoiceId}>
                      <tr 
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : s.invoiceId)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-teal-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {s.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-[180px]">
                          {s.buyerName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {s.invoiceDate}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {s.dueDate}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-900">
                          {formatINR(s.totalAmount)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-emerald-700">
                          {formatINR(s.confirmedPaymentsAllocated)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right font-bold text-red-600">
                          {formatINR(s.outstandingPrincipal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.isOverdue ? (
                            <span className="font-mono text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                              {s.overdueDays} days
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-mono text-[11px]">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            s.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.paymentStatus === 'partially_paid'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : s.paymentStatus === 'disputed'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {s.paymentStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                        </td>
                      </tr>

                      {/* Expanded Sub-table: Line items & PO Cross-verification */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={10} className="p-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                  <span>
                                    PO Match Status: <strong className={`capitalize ${
                                      s.poMatchStatus === 'matched' ? 'text-emerald-700' : s.poMatchStatus === 'discrepancy' ? 'text-red-600' : 'text-slate-600'
                                    }`}>{s.poMatchStatus}</strong>
                                  </span>
                                  <span>
                                    Delivery Proof: <strong className={`capitalize ${
                                      s.deliveryProofStatus === 'verified' ? 'text-emerald-700' : 'text-amber-700'
                                    }`}>{s.deliveryProofStatus}</strong>
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Payment Terms: <strong>{invFields?.paymentTerms || 'Net 30 Days'}</strong>
                                </div>
                              </div>

                              {/* Line Items Table */}
                              {invFields?.lineItems && invFields.lineItems.length > 0 ? (
                                <div className="space-y-1.5">
                                  <div className="text-xs font-semibold text-slate-700">Line Items Breakdown:</div>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                                        <th className="py-1">Description</th>
                                        <th className="py-1 text-center">HSN/SAC</th>
                                        <th className="py-1 text-right">Quantity</th>
                                        <th className="py-1 text-right">Unit Rate (INR)</th>
                                        <th className="py-1 text-right">GST %</th>
                                        <th className="py-1 text-right">Total (INR)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {invFields.lineItems.map((item, idx) => (
                                        <tr key={idx} className="text-slate-800">
                                          <td className="py-1.5 font-medium">{item.description}</td>
                                          <td className="py-1.5 text-center font-mono text-slate-500 text-[11px]">{item.hsnSacCode || '—'}</td>
                                          <td className="py-1.5 text-right font-mono">{item.quantity} {item.unit}</td>
                                          <td className="py-1.5 text-right font-mono">{formatINR(item.unitPrice)}</td>
                                          <td className="py-1.5 text-right font-mono text-slate-500">{item.taxRatePercent || 18}%</td>
                                          <td className="py-1.5 text-right font-mono font-semibold">{formatINR(item.totalPrice)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 italic">No line items breakdown available.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
