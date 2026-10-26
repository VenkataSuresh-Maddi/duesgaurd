import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  CreditCard, 
  FileCheck2, 
  Scale, 
  FileDown, 
  Sliders, 
  Cpu, 
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { DisputeCase, WorkflowStage } from '../../types';

export type NavSection = 
  | 'dashboard'
  | 'workflow'
  | 'documents'
  | 'invoices'
  | 'reconciliation'
  | 'evidence'
  | 'dispute'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  activeCase: DisputeCase;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  activeCase
}) => {
  const navItems = [
    { id: 'dashboard' as NavSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workflow' as NavSection, label: 'Agent Workflow', icon: Cpu, badge: activeCase.workflowStage !== 'idle' ? activeCase.workflowStage : undefined },
    { id: 'documents' as NavSection, label: 'Document Intelligence', icon: FileText, count: activeCase.documents.length },
    { id: 'invoices' as NavSection, label: 'Invoices & Receivables', icon: Receipt, count: activeCase.financialSummaries.length },
    { id: 'reconciliation' as NavSection, label: 'Payment Reconciliation', icon: CreditCard, count: activeCase.paymentAllocations.length },
    { id: 'evidence' as NavSection, label: 'Evidence Analysis', icon: FileCheck2 },
    { id: 'dispute' as NavSection, label: 'Dispute Dossier', icon: Scale },
    { id: 'reports' as NavSection, label: 'Reports & Approval', icon: FileDown, alert: activeCase.humanReview.approvalStatus === 'Draft - Pending Review' },
    { id: 'settings' as NavSection, label: 'Demo Data & Settings', icon: Sliders }
  ];

  const discrepancyCount = activeCase.discrepancies.filter(d => !d.isResolved).length;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white tracking-tight leading-tight truncate">
            DuesGuard AI
          </h1>
          <p className="text-[11px] text-slate-400 truncate">
            MSME Dispute Resolution
          </p>
        </div>
      </div>

      {/* Case Quick Status Card */}
      <div className="p-3 mx-3 my-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400">Active Case</span>
          <span className="font-mono text-teal-400 text-[11px]">{activeCase.caseReference}</span>
        </div>
        <div className="text-xs font-medium text-white truncate mb-2">
          {activeCase.buyerName || 'New Dispute Case'}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-700/50">
          <span>Stage:</span>
          <span className="capitalize text-slate-300 font-medium">{activeCase.workflowStage.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-teal-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {item.alert && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="Awaiting Approval" />
                )}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-teal-700 text-teal-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Discrepancy Alert Banner */}
      {discrepancyCount > 0 && (
        <div className="p-3 mx-3 mb-3 bg-red-950/40 border border-red-800/40 rounded-lg text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold block text-red-200">
              {discrepancyCount} Discrepanc{discrepancyCount > 1 ? 'ies' : 'y'}
            </span>
            <span className="text-[11px] text-red-300/80">Requires reviewer attention</span>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>MSMED Act 2006</span>
        <span>v1.0 Ready</span>
      </div>
    </aside>
  );
};
