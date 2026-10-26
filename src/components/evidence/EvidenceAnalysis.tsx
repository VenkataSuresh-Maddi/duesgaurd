import React, { useState } from 'react';
import { 
  FileCheck2, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Scale, 
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';
import { DisputeCase, MissingEvidenceItem } from '../../types';
import { formatINR } from '../../utils/finance';

interface EvidenceAnalysisProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
  onNavigate: (section: any) => void;
}

export const EvidenceAnalysis: React.FC<EvidenceAnalysisProps> = ({
  activeCase,
  onUpdateCase,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'missing' | 'contradictions' | 'discrepancies'>('missing');

  const evidence = activeCase.evidenceAnalysis;
  const missingCount = evidence?.missingEvidenceChecklist?.length || 0;
  const contradictionCount = evidence?.contradictionRegister?.length || 0;
  const discrepancyCount = activeCase.discrepancies.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Evidence Sufficiency & Legal Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit of documentation against Section 15 & 16 of the MSMED Act 2006 for conciliation readiness.
          </p>
        </div>

        {/* Readiness Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Readiness:</span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
            evidence?.readinessCategory === 'Ready for Review'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : evidence?.readinessCategory === 'Needs Attention'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {evidence?.readinessCategory || 'Ready for Review'}
          </span>
        </div>
      </div>

      {/* Statutory Disclaimer Notice */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Notice on Evidence Authenticity:</strong> DuesGuard AI evaluates evidence sufficiency based strictly on uploaded files and mathematical reconciliation. Processing does not constitute legal certification of document authenticity, which remains subject to formal admission by the counterparty or MSEFC Facilitation Council.
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit text-xs font-medium">
        <button
          onClick={() => setActiveTab('missing')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'missing' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Missing Evidence ({missingCount})
        </button>
        <button
          onClick={() => setActiveTab('contradictions')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'contradictions' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Contradictions ({contradictionCount})
        </button>
        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'discrepancies' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Discrepancy Register ({discrepancyCount})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Evidence Inventory ({activeCase.documents.length})
        </button>
      </div>

      {/* Tab 1: Missing Evidence Checklist */}
      {activeTab === 'missing' && (
        <div className="space-y-4">
          {missingCount === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              All essential commercial evidence items (Invoice, PO, and Delivery Proof) are present in the case bundle.
            </div>
          ) : (
            evidence?.missingEvidenceChecklist.map((item) => (
              <div 
                key={item.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      item.urgency === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.urgency}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  </div>

                  <button
                    onClick={() => onNavigate('documents')}
                    className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors self-start md:self-auto flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                    <span>Upload Supporting File</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
                  <div className="text-slate-700">
                    <strong className="text-slate-900">Why this matters under MSMED Act: </strong>
                    {item.whyUseful}
                  </div>
                  {item.statutoryContext && (
                    <div className="text-slate-500 text-[11px]">
                      <strong>Statutory Basis: </strong>{item.statutoryContext}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Contradictions */}
      {activeTab === 'contradictions' && (
        <div className="space-y-4">
          {contradictionCount === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              No commercial or rate contradictions detected across uploaded documents.
            </div>
          ) : (
            evidence?.contradictionRegister.map((contra) => (
              <div key={contra.id} className="bg-white p-5 rounded-xl border border-red-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-bold text-red-900">{contra.title}</h3>
                </div>
                <p className="text-xs text-slate-700">{contra.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-800 mb-1">Document 1: {contra.documentA.name}</div>
                    <div className="text-slate-600">{contra.documentA.statement}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-800 mb-1">Document 2: {contra.documentB.name}</div>
                    <div className="text-slate-600">{contra.documentB.statement}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Discrepancy Register */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-3">
          {discrepancyCount === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              All calculations, unit rates, and totals are fully reconciled.
            </div>
          ) : (
            activeCase.discrepancies.map((disc) => (
              <div key={disc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">{disc.title}</span>
                  <span className="font-mono text-red-600 font-bold">
                    Impact: {formatINR(disc.amountImpact || 0)}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{disc.description}</p>
                <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1 border-t border-slate-100">
                  <span>Source: <strong>{disc.sourceDocName}</strong></span>
                  <span>·</span>
                  <span>Category: <strong className="capitalize">{disc.category.replace('_', ' ')}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Evidence Inventory */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Evidentiary Relevance</th>
                <th className="py-3 px-4 text-center">User Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCase.documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{doc.fileName}</td>
                  <td className="py-3 px-4 capitalize text-slate-700">{doc.category.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    {doc.category === 'tax_invoice' && 'Primary claim document establishing principal debt and GST details.'}
                    {doc.category === 'purchase_order' && 'Agreed commercial order, unit rates, and payment period terms.'}
                    {doc.category === 'delivery_receipt' && 'Proof of acceptance under MSMED Act Section 2(b).'}
                    {doc.category === 'payment_receipt' && 'Bank credit advice for partial payment reconciliation.'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {doc.isVerifiedByUser ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200">
                        Verified
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Unverified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
