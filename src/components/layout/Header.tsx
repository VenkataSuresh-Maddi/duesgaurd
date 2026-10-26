import React from 'react';
import { Calendar, Play, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { DisputeCase, WorkflowStage } from '../../types';
import { exportCaseJSON } from '../../utils/pdfExport';

interface HeaderProps {
  activeCase: DisputeCase;
  currentSectionTitle: string;
  onAsOfDateChange: (newDate: string) => void;
  onRunWorkflow: () => void;
  isRunningWorkflow: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeCase,
  currentSectionTitle,
  onAsOfDateChange,
  onRunWorkflow,
  isRunningWorkflow
}) => {
  const isApproved = activeCase.humanReview.approvalStatus === 'Approved';
  const isDraft = activeCase.humanReview.approvalStatus === 'Draft - Pending Review';
  const isRejected = activeCase.humanReview.approvalStatus === 'Rejected';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 z-10">
      {/* Zone 1: Contextual Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
        <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">
          {currentSectionTitle}
        </span>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="font-mono text-slate-600 truncate">
          {activeCase.caseReference} ({activeCase.buyerName || 'Unassigned'})
        </span>
        {activeCase.isSyntheticDemo && (
          <>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
              Demo Scenario {activeCase.demoScenarioId || 'A'}
            </span>
          </>
        )}
      </div>

      {/* Zone 2: As-of Date Selector & Controls */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">As-Of Date:</span>
          <input
            type="date"
            value={activeCase.asOfDate}
            onChange={(e) => onAsOfDateChange(e.target.value)}
            className="bg-transparent border-0 text-slate-800 font-medium focus:ring-0 text-xs p-0 cursor-pointer"
          />
        </div>

        {/* Approval Status Badge */}
        <div className="flex items-center gap-1.5 text-xs">
          {isApproved ? (
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved
            </span>
          ) : isRejected ? (
            <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-1 rounded-md font-medium border border-red-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Rejected Draft
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-medium border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Draft Under Review
            </span>
          )}
        </div>

        {/* Export JSON Button */}
        <button
          onClick={() => exportCaseJSON(activeCase)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          title="Save Case as JSON bundle"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Save JSON</span>
        </button>

        {/* Primary Action: Run 4-Agent Pipeline */}
        <button
          onClick={onRunWorkflow}
          disabled={isRunningWorkflow}
          className={`px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm ${
            isRunningWorkflow
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {isRunningWorkflow ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Agents Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-teal-400 fill-teal-400" />
              <span>Run Agent Pipeline</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
