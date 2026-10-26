/**
 * DuesGuard AI - Type Definitions
 * Structured state for MSME Payment Intelligence & Dispute Preparation Platform
 */

export type DocumentCategory = 
  | 'tax_invoice'
  | 'purchase_order'
  | 'delivery_receipt'
  | 'payment_receipt'
  | 'bank_statement'
  | 'credit_note'
  | 'contract'
  | 'correspondence'
  | 'unknown';

export interface LineItem {
  id: string;
  description: string;
  hsnSacCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number; // in INR
  totalPrice: number; // quantity * unitPrice
  taxRatePercent?: number; // e.g. 18 for 18% GST
  taxAmount?: number;
}

export interface ExtractedInvoiceFields {
  invoiceNumber: string;
  supplierName: string;
  supplierGstin?: string;
  supplierPan?: string;
  supplierUdyam?: string; // MSME Udyam registration
  buyerName: string;
  buyerGstin?: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  purchaseOrderRef?: string;
  currency: string;
  lineItems: LineItem[];
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentTerms: string; // e.g., "Net 30 days" or "15 days from delivery"
}

export interface ExtractedPOFields {
  poNumber: string;
  buyerName: string;
  supplierName: string;
  orderDate: string;
  deliveryDatePromise?: string;
  lineItems: LineItem[];
  orderTotal: number;
  paymentTerms: string;
  specialConditions?: string;
}

export interface ExtractedPaymentFields {
  transactionRef: string;
  transactionDate: string;
  payerName: string;
  payeeName: string;
  amount: number;
  currency: string;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Bank Transfer' | 'Other';
  matchedInvoiceRef?: string;
  bankNarration?: string;
}

export interface ExtractedDeliveryFields {
  challanNumber: string;
  deliveryDate: string;
  recipientName: string;
  signedBy?: string;
  vehicleOrLorryNumber?: string;
  goodsReceivedCondition?: 'Accepted in full' | 'Partial' | 'Subject to inspection' | 'Damaged';
  invoiceRef?: string;
}

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: DocumentCategory;
  uploadTimestamp: string;
  processingStatus: 'pending' | 'processing' | 'extracted' | 'verified' | 'error';
  errorMessage?: string;
  confidenceScore: number; // 0 to 1
  pageCount?: number;
  rawTextPreview?: string;
  extractedFields: {
    invoice?: ExtractedInvoiceFields;
    purchaseOrder?: ExtractedPOFields;
    payment?: ExtractedPaymentFields;
    delivery?: ExtractedDeliveryFields;
    general?: Record<string, any>;
  };
  userCorrections?: Record<string, any>;
  isVerifiedByUser: boolean;
  notes?: string;
}

export type DiscrepancySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Discrepancy {
  id: string;
  category: 'po_mismatch' | 'tax_calculation' | 'arithmetic_error' | 'duplicate_invoice' | 'payment_unallocated' | 'date_inconsistency' | 'missing_signature';
  severity: DiscrepancySeverity;
  title: string;
  description: string;
  sourceDocId?: string;
  sourceDocName?: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  amountImpact?: number; // monetary impact in INR
  requiresHumanReview: boolean;
  isResolved: boolean;
  resolutionNote?: string;
}

export interface PaymentAllocation {
  id: string;
  paymentDocId: string;
  transactionRef: string;
  transactionDate: string;
  payerName: string;
  totalPaymentAmount: number;
  allocatedAmount: number;
  targetInvoiceId: string;
  targetInvoiceNumber: string;
  status: 'suggested' | 'confirmed' | 'rejected' | 'manual';
  matchConfidence: number;
  matchExplanation: string;
  isSplitPayment?: boolean;
}

export interface InvoiceFinancialSummary {
  invoiceId: string;
  invoiceNumber: string;
  buyerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  confirmedPaymentsAllocated: number;
  applicableCredits: number;
  validatedAdjustments: number;
  outstandingPrincipal: number; // Deterministically computed
  overdueDays: number; // Computed from as-of date
  isOverdue: boolean;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'overpaid' | 'disputed';
  poMatchStatus: 'matched' | 'discrepancy' | 'no_po_found';
  deliveryProofStatus: 'verified' | 'missing' | 'unconfirmed';
}

export interface MissingEvidenceItem {
  id: string;
  documentType: DocumentCategory;
  title: string;
  description: string;
  whyUseful: string; // Explains legal/MSME conciliation value
  statutoryContext?: string; // e.g. "Section 2(b) of MSMED Act - Day of Acceptance proof"
  urgency: 'critical' | 'recommended' | 'optional';
  relatedInvoiceNumber?: string;
  isUploadedLater: boolean;
}

export interface Contradiction {
  id: string;
  title: string;
  description: string;
  documentA: { id: string; name: string; statement: string };
  documentB: { id: string; name: string; statement: string };
  severity: 'high' | 'medium' | 'low';
}

export interface EvidenceAnalysisResult {
  evidenceInventory: Array<{
    docId: string;
    docName: string;
    category: DocumentCategory;
    relevance: string;
    authenticityNotice: string;
    hasUserVerification: boolean;
  }>;
  missingEvidenceChecklist: MissingEvidenceItem[];
  contradictionRegister: Contradiction[];
  unresolvedQuestions: string[];
  completenessStatus: 'Complete' | 'Substantial (Minor items missing)' | 'Needs Attention (Crucial proof absent)' | 'Contradictory';
  readinessCategory: 'Ready for Review' | 'Needs Attention' | 'Incomplete' | 'Requires Investigation';
}

export interface ChronologyEvent {
  id: string;
  date: string;
  eventType: 'PO_ISSUED' | 'GOODS_DELIVERED' | 'INVOICE_ISSUED' | 'PAYMENT_DUE' | 'PARTIAL_PAYMENT' | 'REMINDER_SENT' | 'DISPUTE_RAISED';
  description: string;
  sourceDocId?: string;
  sourceDocName?: string;
  isVerified: boolean;
}

export interface DisputeReportDraft {
  reportVersion: string;
  generatedDate: string;
  asOfDate: string;
  caseReference: string;
  supplierDetails: {
    name: string;
    gstin?: string;
    udyamNumber?: string;
    address?: string;
    contactPerson?: string;
  };
  buyerDetails: {
    name: string;
    gstin?: string;
    address?: string;
  };
  executiveSummary: string;
  invoiceStatement: InvoiceFinancialSummary[];
  totalInvoiceAmount: number;
  totalConfirmedPayments: number;
  totalOutstandingPrincipal: number;
  totalOverduePrincipal: number;
  reconciliationSummary: string;
  chronology: ChronologyEvent[];
  discrepancies: Discrepancy[];
  evidenceInventory: EvidenceAnalysisResult['evidenceInventory'];
  missingEvidence: MissingEvidenceItem[];
  contradictions: Contradiction[];
  readinessAssessment: {
    status: 'Ready for Review' | 'Needs Attention' | 'Incomplete' | 'Requires Investigation';
    summary: string;
    criteriaChecklist: Array<{ item: string; satisfied: boolean; note: string }>;
  };
  draftPaymentReminder: {
    subject: string;
    recipientName: string;
    recipientEmail?: string;
    bodyContent: string;
    msmeStatutoryClause: string;
  };
  suggestedNextActions: string[];
}

export type ApprovalStatus = 'Draft - Pending Review' | 'Approved' | 'Changes Requested' | 'Rejected';

export interface HumanReviewGateState {
  approvalStatus: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerComments?: string;
  requestedChangesTargetStage?: 'extraction' | 'validation' | 'evidence' | 'report';
  signedOff: boolean;
}

export type WorkflowStage = 
  | 'idle'
  | 'extraction'
  | 'validation'
  | 'evidence'
  | 'report'
  | 'human_approval'
  | 'finalized';

export type StageRunStatus = 'pending' | 'running' | 'completed' | 'needs_review' | 'failed';

export interface StageExecutionLog {
  stage: WorkflowStage;
  agentName: string;
  status: StageRunStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  summary: string;
  details: string[];
  findingsCount?: number;
  errors?: string[];
  canRetry: boolean;
}

export interface DisputeCase {
  id: string;
  caseReference: string;
  title: string;
  createdDate: string;
  asOfDate: string; // The baseline date for calculating overdue days
  isSyntheticDemo: boolean;
  demoScenarioId?: 'A' | 'B' | 'C';
  supplierName: string;
  buyerName: string;
  documents: DocumentMetadata[];
  discrepancies: Discrepancy[];
  paymentAllocations: PaymentAllocation[];
  financialSummaries: InvoiceFinancialSummary[];
  evidenceAnalysis?: EvidenceAnalysisResult;
  reportDraft?: DisputeReportDraft;
  humanReview: HumanReviewGateState;
  workflowStage: WorkflowStage;
  stageLogs: Record<WorkflowStage, StageExecutionLog>;
}
