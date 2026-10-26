import React, { useState } from 'react';
import { 
  Scale, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Mail, 
  Edit3, 
  Save, 
  HelpCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { DisputeCase } from '../../types';
import { formatINR } from '../../utils/finance';

interface DisputeCasePreparationProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
  onNavigate: (section: any) => void;
}

export const DisputeCasePreparation: React.FC<DisputeCasePreparationProps> = ({
  activeCase,
  onUpdateCase,
  onNavigate
}) => {
  const [isEditingReminder, setIsEditingReminder] = useState(false);
  const [reminderBody, setReminderBody] = useState(
    activeCase.reportDraft?.draftPaymentReminder.bodyContent || ''
  );

  const report = activeCase.reportDraft;
  const readiness = report?.readinessAssessment;

  const handleSaveReminder = () => {
    if (!report) return;
    const updatedDraft = {
      ...report,
      draftPaymentReminder: {
        ...report.draftPaymentReminder,
        bodyContent: reminderBody
      }
    };
    onUpdateCase({
      ...activeCase,
      reportDraft: updatedDraft
    });
    setIsEditingReminder(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dispute Case Dossier & Readiness</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured assembly for MSME Samadhaan conciliation council submission and pre-litigation notice.
          </p>
        </div>

        <button
          onClick={() => onNavigate('reports')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <span>Proceed to Human Approval</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Case Header Details Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Case Reference</span>
            <span className="font-mono text-base font-bold text-slate-900">{activeCase.caseReference}</span>
            <span className="text-slate-500 block text-[11px] mt-1">Created: {activeCase.createdDate}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Claimant (Supplier)</span>
            <span className="font-semibold text-slate-900 block">{activeCase.supplierName}</span>
            <span className="text-slate-500 text-[11px]">Udyam: {report?.supplierDetails.udyamNumber || 'Verified MSME'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Respondent (Buyer)</span>
            <span className="font-semibold text-slate-900 block">{activeCase.buyerName}</span>
            <span className="text-slate-500 text-[11px]">GSTIN: {report?.buyerDetails.gstin || '29AAACG8291A1ZB'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Total Outstanding Principal</span>
            <span className="font-mono text-base font-bold text-red-600 block">
              {formatINR(report?.totalOutstandingPrincipal || 0)}
            </span>
            <span className="text-amber-700 font-medium text-[11px]">
              {report?.totalOverduePrincipal ? `${formatINR(report.totalOverduePrincipal)} overdue` : 'Current'}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Case Readiness Criteria & Chronology of Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Readiness Assessment Checklist */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Case-Readiness Checklist</h3>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${
              readiness?.status === 'Ready for Review'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {readiness?.status || 'Ready for Review'}
            </span>
          </div>

          <p className="text-xs text-slate-600">
            {readiness?.summary || 'Audited against documentation completeness and deterministic arithmetic.'}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {readiness?.criteriaChecklist?.map((crit, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                {crit.satisfied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{crit.item}</div>
                  <div className="text-[11px] text-slate-500">{crit.note}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500">
            <strong>Dispute Classification Standard:</strong> DuesGuard evaluates preparedness for MSEFC conciliation, not legal guarantees.
          </div>
        </div>

        {/* Right Column: Chronology of Events */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Chronology of Commercial Events</h3>
            <span className="text-xs text-slate-400">Earliest to Latest</span>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {report?.chronology?.map((event, idx) => (
              <div key={event.id} className="relative flex items-start gap-3 pl-7 text-xs">
                <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-teal-600" />
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 w-full">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-teal-800 font-semibold">{event.date}</span>
                    <span className="text-slate-400 text-[10px] font-mono">{event.eventType}</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formal Payment Reminder Notice Draft */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Statutory Formal Payment Demand Notice Draft
            </h3>
          </div>

          {isEditingReminder ? (
            <button
              onClick={handleSaveReminder}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Edits</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditingReminder(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Reminder Text</span>
            </button>
          )}
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Subject Line:</span>
            <div className="font-semibold text-slate-900 font-mono bg-slate-50 p-2.5 rounded border border-slate-200">
              {report?.draftPaymentReminder.subject}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Letter Body:</span>
            {isEditingReminder ? (
              <textarea
                rows={8}
                value={reminderBody}
                onChange={(e) => setReminderBody(e.target.value)}
                className="w-full p-3 bg-white border border-teal-500 rounded-lg text-slate-800 font-sans text-xs focus:ring-1 focus:ring-teal-500 leading-relaxed"
              />
            ) : (
              <div className="whitespace-pre-line text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed">
                {report?.draftPaymentReminder.bodyContent}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed">
            <strong>Mandatory MSME Clause: </strong>
            {report?.draftPaymentReminder.msmeStatutoryClause}
          </div>
        </div>
      </div>
    </div>
  );
};
