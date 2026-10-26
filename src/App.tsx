import React, { useState, useEffect } from 'react';
import { Sidebar, NavSection } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { AgentExecutionView } from './components/workflow/AgentExecutionView';
import { DocumentIntelligence } from './components/documents/DocumentIntelligence';
import { InvoicesReceivables } from './components/invoices/InvoicesReceivables';
import { PaymentReconciliation } from './components/reconciliation/PaymentReconciliation';
import { EvidenceAnalysis } from './components/evidence/EvidenceAnalysis';
import { DisputeCasePreparation } from './components/dispute/DisputeCasePreparation';
import { ReportsExports } from './components/reports/ReportsExports';
import { SettingsDemoData } from './components/settings/SettingsDemoData';
import { DisputeCase } from './types';
import { createScenarioA, createScenarioB, createScenarioC } from './data/demoData';
import { runFullPipeline } from './utils/stateGraph';
import { calculateOverdueDays } from './utils/finance';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);

  // Initialize with today's date formatted as YYYY-MM-DD
  const todayStr = '2026-10-26';

  // Active in-memory case state
  const [activeCase, setActiveCase] = useState<DisputeCase>(() => {
    const initialCase = createScenarioA(todayStr);
    return initialCase;
  });

  // On first mount, run full pipeline on initial case to establish verified state
  useEffect(() => {
    let isMounted = true;
    runFullPipeline(activeCase).then((processed) => {
      if (isMounted) {
        setActiveCase(processed);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update as-of date and recalculate overdue days deterministically
  const handleAsOfDateChange = (newDate: string) => {
    const updatedSummaries = activeCase.financialSummaries.map(s => {
      const { overdueDays, isOverdue } = calculateOverdueDays(s.dueDate, newDate);
      return {
        ...s,
        overdueDays,
        isOverdue
      };
    });

    const updatedCase: DisputeCase = {
      ...activeCase,
      asOfDate: newDate,
      financialSummaries: updatedSummaries,
      reportDraft: activeCase.reportDraft ? {
        ...activeCase.reportDraft,
        asOfDate: newDate,
        invoiceStatement: updatedSummaries
      } : undefined
    };

    setActiveCase(updatedCase);
  };

  // Run full 4-agent state machine pipeline
  const handleRunWorkflow = async () => {
    setIsRunningWorkflow(true);
    try {
      const processed = await runFullPipeline(activeCase);
      setActiveCase(processed);
      setCurrentSection('workflow');
    } catch (err) {
      console.error('Workflow pipeline failed:', err);
    } finally {
      setIsRunningWorkflow(false);
    }
  };

  // Switch demo scenarios
  const handleLoadScenario = async (scenario: 'A' | 'B' | 'C') => {
    setIsRunningWorkflow(true);
    let newCase: DisputeCase;
    if (scenario === 'A') newCase = createScenarioA(activeCase.asOfDate);
    else if (scenario === 'B') newCase = createScenarioB(activeCase.asOfDate);
    else newCase = createScenarioC(activeCase.asOfDate);

    const processed = await runFullPipeline(newCase);
    setActiveCase(processed);
    setIsRunningWorkflow(false);
  };

  const getSectionTitle = (section: NavSection): string => {
    switch (section) {
      case 'dashboard': return 'Dashboard Overview';
      case 'workflow': return 'Agent Workflow State Graph';
      case 'documents': return 'Document Intelligence';
      case 'invoices': return 'Invoices & Receivables';
      case 'reconciliation': return 'Payment Reconciliation';
      case 'evidence': return 'Evidence Sufficiency & Legal Audit';
      case 'dispute': return 'Dispute Case Preparation';
      case 'reports': return 'Reports & Human Approval Gate';
      case 'settings': return 'Settings & Demo Scenarios';
      default: return 'DuesGuard AI';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Dark Navy Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={(sec) => setCurrentSection(sec)}
        activeCase={activeCase}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header
          activeCase={activeCase}
          currentSectionTitle={getSectionTitle(currentSection)}
          onAsOfDateChange={handleAsOfDateChange}
          onRunWorkflow={handleRunWorkflow}
          isRunningWorkflow={isRunningWorkflow}
        />

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto">
          {currentSection === 'dashboard' && (
            <Dashboard
              activeCase={activeCase}
              onNavigate={(sec) => setCurrentSection(sec)}
              onLoadScenario={handleLoadScenario}
              onRunWorkflow={handleRunWorkflow}
            />
          )}

          {currentSection === 'workflow' && (
            <AgentExecutionView
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
              onNavigate={(sec) => setCurrentSection(sec)}
            />
          )}

          {currentSection === 'documents' && (
            <DocumentIntelligence
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
            />
          )}

          {currentSection === 'invoices' && (
            <InvoicesReceivables
              activeCase={activeCase}
              onNavigate={(sec) => setCurrentSection(sec)}
            />
          )}

          {currentSection === 'reconciliation' && (
            <PaymentReconciliation
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
            />
          )}

          {currentSection === 'evidence' && (
            <EvidenceAnalysis
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
              onNavigate={(sec) => setCurrentSection(sec)}
            />
          )}

          {currentSection === 'dispute' && (
            <DisputeCasePreparation
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
              onNavigate={(sec) => setCurrentSection(sec)}
            />
          )}

          {currentSection === 'reports' && (
            <ReportsExports
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
              onNavigate={(sec) => setCurrentSection(sec)}
            />
          )}

          {currentSection === 'settings' && (
            <SettingsDemoData
              activeCase={activeCase}
              onUpdateCase={setActiveCase}
              onNavigate={(sec) => setCurrentSection(sec)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
