import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  ArrowRight, 
  ArrowDown, 
  FileSearch, 
  Scale, 
  ShieldCheck, 
  FileText,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DisputeCase, WorkflowStage, StageRunStatus } from '../../types';
import { 
  runExtractionAgent, 
  runValidationAgent, 
  runEvidenceAgent, 
  runReportAgent 
} from '../../utils/stateGraph';
import { formatINR } from '../../utils/finance';

interface AgentExecutionViewProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
  onNavigate: (section: any) => void;
}

export const AgentExecutionView: React.FC<AgentExecutionViewProps> = ({
  activeCase,
  onUpdateCase,
  onNavigate
}) => {
  const [executingStage, setExecutingStage] = useState<WorkflowStage | null>(null);
  const [expandedStage, setExpandedStage] = useState<WorkflowStage | null>('validation');

  const handleRunStage = async (stage: WorkflowStage) => {
    setExecutingStage(stage);
    try {
      let result;
      if (stage === 'extraction') {
        result = await runExtractionAgent(activeCase);
      } else if (stage === 'validation') {
        result = await runValidationAgent(activeCase);
      } else if (stage === 'evidence') {
        result = await runEvidenceAgent(activeCase);
      } else if (stage === 'report') {
        result = await runReportAgent(activeCase);
      }
      if (result) {
        onUpdateCase(result.updatedCase);
      }
    } catch (err) {
      console.error(`Failed executing stage ${stage}:`, err);
    } finally {
      setExecutingStage(null);
    }
  };

  const stages: Array<{
    id: WorkflowStage;
    number: string;
    name: string;
    icon: any;
    role: string;
    outputsSummary: string;
  }> = [
    {
      id: 'extraction',
      number: '01',
      name: 'Extraction Agent',
      icon: FileSearch,
      role: 'Parses unstructured commercial documents into verified schema fields without hallucinating absent data.',
      outputsSummary: `${activeCase.documents.length} document(s) categorized and extracted.`
    },
    {
      id: 'validation',
      number: '02',
      name: 'Validation Agent',
      icon: Scale,
      role: 'Performs decimal-safe financial arithmetic, PO reconciliation, partial payment allocation, and overdue calculation.',
      outputsSummary: `${activeCase.financialSummaries.length} invoice principal(s) verified; ${activeCase.discrepancies.length} discrepancy/discrepancies detected.`
    },
    {
      id: 'evidence',
      number: '03',
      name: 'Evidence Agent',
      icon: ShieldCheck,
      role: 'Audits evidence completeness against Section 15 & 16 of MSMED Act 2006, identifying missing proof of acceptance.',
      outputsSummary: `${activeCase.evidenceAnalysis?.missingEvidenceChecklist?.length || 0} missing item(s), readiness: ${activeCase.evidenceAnalysis?.readinessCategory || 'Pending'}.`
    },
    {
      id: 'report',
      number: '04',
      name: 'Report Agent',
      icon: FileText,
      role: 'Compiles the formal dispute dossier, chronology, invoice statements, and statutory payment demand reminder.',
      outputsSummary: activeCase.reportDraft ? `Draft report compiled (v${activeCase.reportDraft.reportVersion}).` : 'Awaiting generation.'
    },
    {
      id: 'human_approval',
      number: '05',
      name: 'Human Approval Gate',
      icon: UserCheck,
      role: 'Enforces human reviewer sign-off before any document is labeled Approved or exported.',
      outputsSummary: `Status: ${activeCase.humanReview.approvalStatus}`
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Title & Architecture Statement */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Agentic Workflow & State Graph</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Explicit 4-agent state machine with deterministic transitions, structured state passing, and human approval gate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunStage('extraction')}
            disabled={executingStage !== null}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset & Reprocess</span>
          </button>
        </div>
      </div>

      {/* Visual State Graph Diagram */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-sm border border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span>Active State Machine Pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 relative">
          {stages.map((st) => {
            const isCurrent = activeCase.workflowStage === st.id;
            const log = activeCase.stageLogs[st.id];
            const isCompleted = log?.status === 'completed';
            const isNeedsReview = log?.status === 'needs_review';
            const isRunning = executingStage === st.id;

            return (
              <div
                key={st.id}
                onClick={() => setExpandedStage(st.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isRunning
                    ? 'border-teal-400 bg-slate-800 ring-2 ring-teal-400/50'
                    : isCurrent
                    ? 'border-teal-500/80 bg-slate-800/90 ring-1 ring-teal-500'
                    : isCompleted
                    ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70'
                    : isNeedsReview
                    ? 'border-amber-500/60 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-mono text-slate-400">{st.number}</span>
                  {isRunning ? (
                    <span className="text-teal-300 animate-pulse text-[10px]">Running...</span>
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  ) : isNeedsReview ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>

                <div className="font-semibold text-xs text-white truncate mb-1">
                  {st.name}
                </div>

                <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {st.outputsSummary}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Inspection & Controls */}
      <div className="space-y-4">
        {stages.map((st) => {
          const isExpanded = expandedStage === st.id;
          const log = activeCase.stageLogs[st.id];
          const isRunning = executingStage === st.id;
          const Icon = st.icon;

          return (
            <div
              key={st.id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-200'
              }`}
            >
              {/* Stage Header Accordion */}
              <div
                onClick={() => setExpandedStage(isExpanded ? null : st.id)}
                className="p-5 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    log?.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : log?.status === 'needs_review'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{st.number}.</span>
                      <h3 className="text-sm font-semibold text-slate-900">{st.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        log?.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log?.status === 'needs_review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {log?.status === 'completed' ? 'Completed' : log?.status === 'needs_review' ? 'Needs Review' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{st.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {st.id !== 'human_approval' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunStage(st.id);
                      }}
                      disabled={isRunning}
                      className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 text-teal-600 fill-teal-600" />
                      <span>{isRunning ? 'Running...' : 'Run Stage'}</span>
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Stage Body Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
                  {/* Summary & Timestamps */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Execution Summary:</span>
                      <span className="text-slate-800 font-medium">{log?.summary || 'Not yet triggered'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Completed At:</span>
                      <span className="text-slate-800 font-mono text-[11px]">{log?.completedAt || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Duration:</span>
                      <span className="text-slate-800 font-mono text-[11px]">{log?.durationMs ? `${log.durationMs}ms` : '—'}</span>
                    </div>
                  </div>

                  {/* Stage Specific Artifacts */}
                  {st.id === 'extraction' && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700">Processed Documents:</div>
                      <div className="space-y-1.5">
                        {activeCase.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-md text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-800">{doc.fileName}</span>
                              <span className="text-slate-400 text-[11px]">({doc.category})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 text-[11px]">Confidence: {(doc.confidenceScore * 100).toFixed(0)}%</span>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200">
                                {doc.processingStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {st.id === 'validation' && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-700">Financial Calculation Findings:</div>
                      {activeCase.financialSummaries.map((fin) => (
                        <div key={fin.invoiceId} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-900">Invoice: {fin.invoiceNumber}</span>
                            <span className="font-mono text-red-600 font-bold">
                              Outstanding: {formatINR(fin.outstandingPrincipal)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                            <div>Total: <span className="font-mono">{formatINR(fin.totalAmount)}</span></div>
                            <div>Paid: <span className="font-mono">{formatINR(fin.confirmedPaymentsAllocated)}</span></div>
                            <div>Overdue: <span className="font-medium text-amber-700">{fin.overdueDays} days</span></div>
                            <div>PO Match: <span className="font-medium capitalize">{fin.poMatchStatus}</span></div>
                          </div>
                        </div>
                      ))}

                      {activeCase.discrepancies.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-1">
                          <div className="font-semibold flex items-center gap-1.5 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Discrepancies Requiring Review ({activeCase.discrepancies.length})
                          </div>
                          {activeCase.discrepancies.map(d => (
                            <div key={d.id} className="text-[11px] text-red-800">
                              • <strong>{d.title}</strong>: {d.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {st.id === 'evidence' && (
                    <div className="space-y-2 text-xs">
                      <div className="text-xs font-semibold text-slate-700">Missing Evidence Analysis (MSMED Act):</div>
                      {activeCase.evidenceAnalysis?.missingEvidenceChecklist?.map(m => (
                        <div key={m.id} className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-md">
                          <div className="font-semibold text-amber-900 mb-0.5">{m.title}</div>
                          <div className="text-[11px] text-amber-800 mb-1">{m.description}</div>
                          <div className="text-[10px] text-amber-700 font-medium">Relevance: {m.whyUseful}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {st.id === 'report' && (
                    <div className="space-y-2 text-xs">
                      <div className="text-xs font-semibold text-slate-700">Executive Summary Preview:</div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs leading-relaxed">
                        {activeCase.reportDraft?.executiveSummary || 'Report draft has not been synthesized yet.'}
                      </div>
                    </div>
                  )}

                  {st.id === 'human_approval' && (
                    <div className="space-y-3 text-xs">
                      <div className="text-xs font-semibold text-slate-700">Approval Gate Controls:</div>
                      <p className="text-xs text-slate-600">
                        Human sign-off guarantees no claims or payment reminders are dispatched without verified operator sign-off.
                      </p>
                      <button
                        onClick={() => onNavigate('reports')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors text-xs"
                      >
                        Open Human Approval Screen
                      </button>
                    </div>
                  )}

                  {/* Stage Detailed Logs */}
                  {log?.details && log.details.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Execution Trace:</span>
                      <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
                        {log.details.map((line: string, i: number) => (
                          <div key={i} className="leading-tight">{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
