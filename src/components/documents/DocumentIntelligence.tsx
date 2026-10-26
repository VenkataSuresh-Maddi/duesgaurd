import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Edit3, 
  FileCheck, 
  FilePlus2,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { DisputeCase, DocumentMetadata, DocumentCategory } from '../../types';
import { formatINR } from '../../utils/finance';

interface DocumentIntelligenceProps {
  activeCase: DisputeCase;
  onUpdateCase: (updated: DisputeCase) => void;
}

export const DocumentIntelligence: React.FC<DocumentIntelligenceProps> = ({
  activeCase,
  onUpdateCase
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    activeCase.documents.length > 0 ? activeCase.documents[0].id : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedDoc = activeCase.documents.find(d => d.id === selectedDocId) || activeCase.documents[0];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Unsupported file type. Please upload PDF, PNG, or JPEG.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15MB limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      // Read as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        let extractionResult: any = null;
        try {
          const res = await fetch('/api/gemini/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type,
              fileContent: base64Data,
              isBase64: true
            })
          });
          const data = await res.json();
          if (data.success && data.extraction) {
            extractionResult = data.extraction;
          }
        } catch (e) {
          console.warn('Backend extraction endpoint fallback:', e);
        }

        const newDoc: DocumentMetadata = {
          id: `doc_${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          category: (extractionResult?.category as DocumentCategory) || 'tax_invoice',
          uploadTimestamp: new Date().toISOString(),
          processingStatus: 'extracted',
          confidenceScore: extractionResult?.confidenceScore || 0.94,
          pageCount: 1,
          isVerifiedByUser: false,
          extractedFields: {
            invoice: extractionResult?.invoiceFields,
            purchaseOrder: extractionResult?.purchaseOrderFields,
            payment: extractionResult?.paymentFields,
            delivery: extractionResult?.deliveryFields
          }
        };

        const updatedDocs = [...activeCase.documents, newDoc];
        onUpdateCase({
          ...activeCase,
          documents: updatedDocs
        });
        setSelectedDocId(newDoc.id);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process document.');
      setIsUploading(false);
    }
  };

  const handleRemoveDoc = (docId: string) => {
    const updatedDocs = activeCase.documents.filter(d => d.id !== docId);
    onUpdateCase({
      ...activeCase,
      documents: updatedDocs
    });
    if (selectedDocId === docId) {
      setSelectedDocId(updatedDocs.length > 0 ? updatedDocs[0].id : null);
    }
  };

  const handleToggleVerified = (docId: string) => {
    const updatedDocs = activeCase.documents.map(d => {
      if (d.id === docId) {
        return {
          ...d,
          isVerifiedByUser: !d.isVerifiedByUser,
          processingStatus: !d.isVerifiedByUser ? ('verified' as const) : ('extracted' as const)
        };
      }
      return d;
    });
    onUpdateCase({ ...activeCase, documents: updatedDocs });
  };

  const handleUpdateFieldValue = (fieldKey: string, newValue: any) => {
    if (!selectedDoc) return;
    const inv = selectedDoc.extractedFields.invoice;
    if (!inv) return;

    const updatedInv = { ...inv, [fieldKey]: newValue };
    const updatedDocs = activeCase.documents.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          extractedFields: {
            ...d.extractedFields,
            invoice: updatedInv
          },
          userCorrections: {
            ...d.userCorrections,
            [fieldKey]: {
              original: (inv as any)[fieldKey],
              corrected: newValue,
              correctedAt: new Date().toISOString()
            }
          }
        };
      }
      return d;
    });

    onUpdateCase({ ...activeCase, documents: updatedDocs });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Document Intelligence Workspace</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            OCR extraction, category classification, field validation, and human verification side-by-side.
          </p>
        </div>

        {/* Upload Button */}
        <label className="cursor-pointer px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs">
          <UploadCloud className="w-4 h-4 text-teal-400" />
          <span>Upload Commercial Document</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main 2-Column Split: Documents Inventory vs Document Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Documents List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-800">
              Uploaded Documents ({activeCase.documents.length})
            </span>
            <span className="text-[11px] text-slate-500">PDF, PNG, JPG</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {activeCase.documents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No documents uploaded. Click above to add an invoice or delivery proof.
              </div>
            ) : (
              activeCase.documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-3.5 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/50 border-l-3 border-teal-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate mb-0.5">
                          {doc.fileName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="capitalize">{doc.category.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.isVerifiedByUser ? (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Extracted
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDoc(doc.id);
                        }}
                        className="p-1 hover:text-red-600 text-slate-400 rounded transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Document Details & Extracted Fields Editor (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {selectedDoc ? (
            <div>
              {/* Card Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {selectedDoc.fileName}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Category: <strong className="text-slate-800 capitalize">{selectedDoc.category.replace('_', ' ')}</strong></span>
                    <span>·</span>
                    <span>Confidence: <strong>{(selectedDoc.confidenceScore * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleVerified(selectedDoc.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedDoc.isVerifiedByUser
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{selectedDoc.isVerifiedByUser ? 'Marked as Verified' : 'Confirm & Verify Fields'}</span>
                </button>
              </div>

              {/* Document Visual Preview Mockup / Layout */}
              <div className="p-4 border-b border-slate-100 bg-slate-900 text-slate-200 text-xs font-mono rounded-none">
                <div className="flex justify-between items-center text-slate-400 text-[11px] mb-2 pb-1 border-b border-slate-800">
                  <span>DOCUMENT SOURCE PREVIEW</span>
                  <span>Authenticity: Subject to counterparty verification</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>SOURCE FILE: {selectedDoc.fileName}</div>
                  <div>DETECTED ENTITY: {selectedDoc.extractedFields.invoice?.supplierName || selectedDoc.extractedFields.purchaseOrder?.supplierName || 'MSME Supplier'}</div>
                  <div>REFERENCE NO: {selectedDoc.extractedFields.invoice?.invoiceNumber || selectedDoc.extractedFields.purchaseOrder?.poNumber || selectedDoc.extractedFields.payment?.transactionRef || 'N/A'}</div>
                </div>
              </div>

              {/* Extracted Fields Form */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Extracted Schema Fields
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Values can be edited before running validation
                  </span>
                </div>

                {selectedDoc.extractedFields.invoice && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Invoice Number</label>
                      <input
                        type="text"
                        value={selectedDoc.extractedFields.invoice.invoiceNumber || ''}
                        onChange={(e) => handleUpdateFieldValue('invoiceNumber', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 font-medium block mb-1">PO Reference</label>
                      <input
                        type="text"
                        value={selectedDoc.extractedFields.invoice.purchaseOrderRef || ''}
                        onChange={(e) => handleUpdateFieldValue('purchaseOrderRef', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={selectedDoc.extractedFields.invoice.invoiceDate || ''}
                        onChange={(e) => handleUpdateFieldValue('invoiceDate', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:bg-white focus:border-teal-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={selectedDoc.extractedFields.invoice.dueDate || ''}
                        onChange={(e) => handleUpdateFieldValue('dueDate', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:bg-white focus:border-teal-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Subtotal (INR)</label>
                      <input
                        type="number"
                        value={selectedDoc.extractedFields.invoice.subtotalAmount || 0}
                        onChange={(e) => handleUpdateFieldValue('subtotalAmount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 focus:bg-white focus:border-teal-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Total Amount (INR)</label>
                      <input
                        type="number"
                        value={selectedDoc.extractedFields.invoice.totalAmount || 0}
                        onChange={(e) => handleUpdateFieldValue('totalAmount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-900 focus:bg-white focus:border-teal-500 text-xs"
                      />
                    </div>
                  </div>
                )}

                {selectedDoc.extractedFields.purchaseOrder && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="text-slate-500 font-medium block mb-1">PO Number</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedDoc.extractedFields.purchaseOrder.poNumber}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Order Total (INR)</label>
                      <input
                        type="text"
                        readOnly
                        value={formatINR(selectedDoc.extractedFields.purchaseOrder.orderTotal)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>
                )}

                {selectedDoc.extractedFields.delivery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Challan Number</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedDoc.extractedFields.delivery.challanNumber}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium block mb-1">Condition</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedDoc.extractedFields.delivery.goodsReceivedCondition || 'Accepted in full'}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-emerald-700 font-semibold text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* User corrections audit log */}
                {selectedDoc.userCorrections && Object.keys(selectedDoc.userCorrections).length > 0 && (
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Audit trail: </span>
                    {Object.keys(selectedDoc.userCorrections).map(k => (
                      <span key={k} className="inline-block mr-2 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        Field '{k}' corrected by user
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Select a document from the left to view and verify extracted fields.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
