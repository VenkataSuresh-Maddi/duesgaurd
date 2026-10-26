import React, { useState } from 'react';
import { 
  FileDown, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  MessageSquare, 
  Download, 
  Printer, 
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { DisputeCase, ApprovalStatus, WorkflowStage } from '../../types';
import { generateDisputePDF, exportInvoicesCSV, exportCaseJSON } from '../../utils/pdfExport';
import { formatINR } from '../../utils/finance';

interface ReportsExportsProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
  onNavigate: (section: any) => void;
}

export const ReportsExports: React.FC<ReportsExportsProps> = ({
  activeCase,
  onUpdateCase,
  onNavigate
}) => {
  const [reviewerName, setReviewerName] = useState('MSME Managing Director / Advocate');
  const [comments, setComments] = useState('');
  const [targetStage, setTargetStage] = useState<'extraction' | 'validation' | 'evidence' | 'report'>('validation');
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);

  const report = activeCase.reportDraft;
  const review = activeCase.humanReview;

  const isApproved = review.approvalStatus === 'Approved';
  const isRejected = review.approvalStatus === 'Rejected';
  const isPending = review.approvalStatus === 'Draft - Pending Review';

  // 1. Approve & Finalize
  const handleApprove = () => {
    const updated: DisputeCase = {
      ...activeCase,
      humanReview: {
        approvalStatus: 'Approved',
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        reviewerComments: comments || 'Formally approved for commercial notice dispatch and MSEFC filing.',
        signedOff: true
      },
      workflowStage: 'finalized',
      stageLogs: {
        ...activeCase.stageLogs,
        human_approval: {
          stage: 'human_approval',
          agentName: 'Human Approval Gate',
          status: 'completed',
          completedAt: new Date().toISOString(),
          summary: `Approved by ${reviewerName}. Official case bundle unlocked.`,
          details: [`Sign-off completed at ${new Date().toLocaleString()}`, `Comments: ${comments || 'None'}`],
          canRetry: false
        }
      }
    };
    onUpdateCase(updated);
  };

  // 2. Reject Draft
  const handleReject = () => {
    const updated: DisputeCase = {
      ...activeCase,
      humanReview: {
        approvalStatus: 'Rejected',
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        reviewerComments: comments || 'Rejected due to unresolved commercial disputes or incorrect figures.',
        signedOff: false
      },
      stageLogs: {
        ...activeCase.stageLogs,
        human_approval: {
          stage: 'human_approval',
          agentName: 'Human Approval Gate',
          status: 'needs_review',
          completedAt: new Date().toISOString(),
          summary: `Draft rejected by ${reviewerName}. Export as approved prohibited.`,
          details: [`Rejection registered. Reason: ${comments || 'Commercial discrepancies'}`],
          canRetry: true
        }
      }
    };
    onUpdateCase(updated);
  };

  // 3. Request Changes
  const handleConfirmRequestChanges = () => {
    const updated: DisputeCase = {
      ...activeCase,
      workflowStage: targetStage,
      humanReview: {
        approvalStatus: 'Changes Requested',
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        reviewerComments: comments,
        requestedChangesTargetStage: targetStage,
        signedOff: false
      },
      stageLogs: {
        ...activeCase.stageLogs,
        human_approval: {
          stage: 'human_approval',
          agentName: 'Human Approval Gate',
          status: 'needs_review',
          summary: `Changes requested. Returned workflow to '${targetStage}' stage.`,
          details: [`Reviewer feedback: ${comments}`],
          canRetry: true
        }
      }
    };
    onUpdateCase(updated);
    setShowRequestChangesModal(false);
    onNavigate(targetStage === 'extraction' ? 'documents' : targetStage === 'validation' ? 'invoices' : targetStage === 'evidence' ? 'evidence' : 'dispute');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & Human Approval Gate</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict human oversight: Only an explicitly signed-off dossier can be labeled 'Approved'.
          </p>
        </div>

        {/* Export Action Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportInvoicesCSV(activeCase)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Download CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => exportCaseJSON(activeCase)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Download JSON Bundle"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => generateDisputePDF(activeCase)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export PDF Document"
          >
            <FileDown className="w-3.5 h-3.5 text-teal-400" />
            <span>{isApproved ? 'Download Approved PDF' : 'Download Draft PDF'}</span>
          </button>
        </div>
      </div>

      {/* Human Approval Gate Dedicated Decision Box */}
      <div className={`p-6 rounded-xl border shadow-xs transition-colors ${
        isApproved 
          ? 'bg-emerald-50/50 border-emerald-300'
          : isRejected
          ? 'bg-red-50/50 border-red-300'
          : 'bg-white border-slate-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isApproved ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Human Approval Gate</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isApproved 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isRejected
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {review.approvalStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review findings, commercial totals, and missing evidence before authorizing notice dispatch.
              </p>
            </div>
          </div>

          {/* Gate Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleApprove}
              disabled={isApproved}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                isApproved 
                  ? 'bg-emerald-200 text-emerald-800 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproved ? 'Approved & Finalized' : '1. Approve and Finalize'}</span>
            </button>

            <button
              onClick={() => setShowRequestChangesModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>2. Request Changes</span>
            </button>

            <button
              onClick={handleReject}
              disabled={isRejected}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                isRejected 
                  ? 'bg-red-200 text-red-800 cursor-default'
                  : 'bg-white border border-red-300 text-red-700 hover:bg-red-50'
              }`}
            >
              <XCircle className="w-4 h-4 text-red-600" />
              <span>3. Reject Draft</span>
            </button>
          </div>
        </div>

        {/* Reviewer Sign-off Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-500 font-medium block mb-1">Reviewer Name / Title</label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="text-slate-500 font-medium block mb-1">Reviewer Comments / Observations</label>
            <input
              type="text"
              placeholder="e.g., Reviewed against signed delivery challan and PO rate terms."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs"
            />
          </div>
        </div>

        {review.reviewedAt && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Reviewed by: <strong>{review.reviewedBy}</strong></span>
            <span>Timestamp: <span className="font-mono">{new Date(review.reviewedAt).toLocaleString()}</span></span>
          </div>
        )}
      </div>

      {/* Structured Dispute Dossier Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Document Header Watermark Banner */}
        <div className={`p-4 text-xs font-bold uppercase tracking-wider text-center border-b ${
          isApproved 
            ? 'bg-emerald-600 text-white border-emerald-700'
            : isRejected
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-amber-100 text-amber-900 border-amber-200'
        }`}>
          {isApproved 
            ? 'APPROVED DISPUTE CASE DOSSIER — READY FOR COMMERCIAL NOTICE & MSEFC FILING'
            : isRejected
            ? 'REJECTED DRAFT — DO NOT PRESENT AS AUTHORIZED'
            : 'UNAPPROVED DRAFT DOSSIER — SUBJECT TO HUMAN APPROVAL GATE'}
        </div>

        <div className="p-8 space-y-6">
          {/* Dossier Meta */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-bold text-slate-900">MSME Dispute Dossier</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Prepared under Section 15 & 16 of the Micro, Small and Medium Enterprises Development Act, 2006.
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div>Ref: {activeCase.caseReference}</div>
              <div>Generated: {report?.generatedDate}</div>
              <div>As-Of: {report?.asOfDate}</div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Executive Summary
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
              {report?.executiveSummary}
            </p>
          </div>

          {/* Section 2: Statement of Outstanding Principal */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Statement of Invoices & Receivables
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-2.5">Invoice #</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5 text-right">Billed Amount</th>
                    <th className="p-2.5 text-right">Confirmed Paid</th>
                    <th className="p-2.5 text-right">Outstanding Principal</th>
                    <th className="p-2.5 text-center">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report?.invoiceStatement.map((inv) => (
                    <tr key={inv.invoiceId}>
                      <td className="p-2.5 font-mono font-medium">{inv.invoiceNumber}</td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">{inv.invoiceDate}</td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">{inv.dueDate}</td>
                      <td className="p-2.5 text-right font-mono">{formatINR(inv.totalAmount)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-700">{formatINR(inv.confirmedPaymentsAllocated)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-red-600">{formatINR(inv.outstandingPrincipal)}</td>
                      <td className="p-2.5 text-center font-mono text-[11px]">{inv.overdueDays} days</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <td colSpan={3} className="p-2.5 text-slate-800">TOTAL ARITHMETIC RECONCILIATION</td>
                    <td className="p-2.5 text-right font-mono">{formatINR(report?.totalInvoiceAmount || 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald-700">{formatINR(report?.totalConfirmedPayments || 0)}</td>
                    <td className="p-2.5 text-right font-mono text-red-600">{formatINR(report?.totalOutstandingPrincipal || 0)}</td>
                    <td className="p-2.5 text-center text-amber-700 font-mono">{formatINR(report?.totalOverduePrincipal || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Discrepancy & Contradiction Register */}
          {activeCase.discrepancies.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-700">
                3. Discrepancy Register ({activeCase.discrepancies.length} Item(s))
              </h3>
              <div className="space-y-2">
                {activeCase.discrepancies.map(d => (
                  <div key={d.id} className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-xs">
                    <div className="font-semibold text-red-900">{d.title}</div>
                    <div className="text-red-800 text-[11px] mt-0.5">{d.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Missing Evidence & Statutory Justification */}
          {report?.missingEvidence && report.missingEvidence.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Missing Supporting Documents & Evidence Justification
              </h3>
              <div className="space-y-2">
                {report.missingEvidence.map(m => (
                  <div key={m.id} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs">
                    <div className="font-semibold text-amber-900">{m.title}</div>
                    <div className="text-slate-700 text-[11px] mt-0.5">{m.whyUseful}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Request Workflow Changes</h3>
            <p className="text-xs text-slate-600">
              Specify reviewer comments and select which stage the state machine should roll back to.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Return to Stage:</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="extraction">Stage 1: Extraction Agent (Re-inspect documents)</option>
                  <option value="validation">Stage 2: Validation Agent (Recalculate balances & discrepancies)</option>
                  <option value="evidence">Stage 3: Evidence Agent (Re-evaluate evidence checklist)</option>
                  <option value="report">Stage 4: Report Agent (Re-draft summary & reminder)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Reviewer Feedback Notes:</label>
                <textarea
                  rows={4}
                  placeholder="Detail what needs correction (e.g. adjust unit rate variance, recheck delivery date)..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRequestChangesModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRequestChanges}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
              >
                Return to {targetStage} Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
