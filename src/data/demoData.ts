/**
 * DuesGuard AI - Synthetic Demo Data for MSME Scenarios
 * 
 * Accurately implements the 3 synthetic demonstration scenarios from the specification:
 * - Scenario A: Unpaid invoice (₹1,20,000; Confirmed: ₹0; 30 days overdue)
 * - Scenario B: Partial payment (₹1,00,000; Confirmed: ₹30,000; Outstanding: ₹70,000; 15 days overdue)
 * - Scenario C: Purchase-order discrepancy (Invoice: ₹85,000; PO: ₹80,000; ₹5,000 discrepancy detected)
 */

import { DisputeCase, DocumentMetadata } from '../types';

/**
 * Calculates a date relative to an as-of date by offset in days
 */
export function getRelativeDate(asOfDateStr: string, dayOffset: number): string {
  const d = new Date(asOfDateStr);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

/**
 * Generates Scenario A: Unpaid Invoice
 */
export function createScenarioA(asOfDate: string): DisputeCase {
  const invoiceDate = getRelativeDate(asOfDate, -60); // Raised 60 days ago
  const dueDate = getRelativeDate(asOfDate, -30); // Due 30 days ago (30 days overdue)
  const deliveryDate = getRelativeDate(asOfDate, -62);

  const invoiceDoc: DocumentMetadata = {
    id: 'doc_scen_a_inv',
    fileName: 'INV-2026-089_Shree_Forgings.pdf',
    fileSize: 245100,
    fileType: 'application/pdf',
    category: 'tax_invoice',
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'extracted',
    confidenceScore: 0.98,
    pageCount: 1,
    isVerifiedByUser: true,
    extractedFields: {
      invoice: {
        invoiceNumber: 'INV-2026-089',
        supplierName: 'Shree Krishna Precision Forgings Pvt Ltd',
        supplierGstin: '27AABCS1429B1Z2',
        supplierUdyam: 'UDYAM-MH-03-0019284',
        buyerName: 'Tata Precision Auto Components Ltd',
        buyerGstin: '27AAACG8291A1ZB',
        invoiceDate,
        dueDate,
        purchaseOrderRef: 'PO-TAC-8819',
        currency: 'INR',
        lineItems: [
          {
            id: 'li_a_1',
            description: 'Forged High-Tensile Flange 45mm Grade EN8',
            hsnSacCode: '7326',
            quantity: 200,
            unit: 'PCS',
            unitPrice: 500,
            totalPrice: 100000,
            taxRatePercent: 18,
            taxAmount: 18000
          },
          {
            id: 'li_a_2',
            description: 'Protective Anti-Rust Primer Treatment',
            hsnSacCode: '9988',
            quantity: 1,
            unit: 'LOT',
            unitPrice: 2000,
            totalPrice: 2000,
            taxRatePercent: 0,
            taxAmount: 0
          }
        ],
        subtotalAmount: 102000,
        taxAmount: 18000,
        discountAmount: 0,
        totalAmount: 120000,
        paymentTerms: 'Payment strictly within 30 days from delivery as per MSMED Act 2006'
      }
    }
  };

  const deliveryDoc: DocumentMetadata = {
    id: 'doc_scen_a_del',
    fileName: 'DC-442_Signed_Delivery_Challan.pdf',
    fileSize: 312000,
    fileType: 'application/pdf',
    category: 'delivery_receipt',
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'extracted',
    confidenceScore: 0.96,
    pageCount: 1,
    isVerifiedByUser: true,
    extractedFields: {
      delivery: {
        challanNumber: 'DC-442',
        deliveryDate,
        recipientName: 'Tata Precision Auto Components Ltd (Warehouse Gate 3)',
        signedBy: 'R. K. Sharma (Stores Supervisor)',
        vehicleOrLorryNumber: 'MH-12-RN-7721',
        goodsReceivedCondition: 'Accepted in full',
        invoiceRef: 'INV-2026-089'
      }
    }
  };

  return {
    id: 'case_scen_a',
    caseReference: 'DG-2026-001',
    title: 'Shree Krishna Forgings vs Tata Precision Auto',
    createdDate: new Date().toISOString().split('T')[0],
    asOfDate,
    isSyntheticDemo: true,
    demoScenarioId: 'A',
    supplierName: 'Shree Krishna Precision Forgings Pvt Ltd',
    buyerName: 'Tata Precision Auto Components Ltd',
    documents: [invoiceDoc, deliveryDoc],
    discrepancies: [],
    paymentAllocations: [],
    financialSummaries: [
      {
        invoiceId: invoiceDoc.id,
        invoiceNumber: 'INV-2026-089',
        buyerName: 'Tata Precision Auto Components Ltd',
        invoiceDate,
        dueDate,
        totalAmount: 120000,
        confirmedPaymentsAllocated: 0,
        applicableCredits: 0,
        validatedAdjustments: 0,
        outstandingPrincipal: 120000,
        overdueDays: 30,
        isOverdue: true,
        paymentStatus: 'unpaid',
        poMatchStatus: 'no_po_found',
        deliveryProofStatus: 'verified'
      }
    ],
    humanReview: {
      approvalStatus: 'Draft - Pending Review',
      signedOff: false
    },
    workflowStage: 'idle',
    stageLogs: getInitialStageLogs()
  };
}

/**
 * Generates Scenario B: Partial Payment
 */
export function createScenarioB(asOfDate: string): DisputeCase {
  const invoiceDate = getRelativeDate(asOfDate, -45);
  const dueDate = getRelativeDate(asOfDate, -15); // Due 15 days ago (15 days overdue)
  const paymentDate = getRelativeDate(asOfDate, -10);

  const invoiceDoc: DocumentMetadata = {
    id: 'doc_scen_b_inv',
    fileName: 'INV-2026-104_Apex_Castings.pdf',
    fileSize: 198000,
    fileType: 'application/pdf',
    category: 'tax_invoice',
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'extracted',
    confidenceScore: 0.99,
    pageCount: 1,
    isVerifiedByUser: true,
    extractedFields: {
      invoice: {
        invoiceNumber: 'INV-2026-104',
        supplierName: 'Apex Castings & Machining LLP',
        supplierGstin: '24AAHFA3910C1Z1',
        supplierUdyam: 'UDYAM-GJ-01-0044819',
        buyerName: 'Bharat Heavy Dynamics Corporation',
        buyerGstin: '24AACCD7712M1Z8',
        invoiceDate,
        dueDate,
        purchaseOrderRef: 'BHD-PO-9941',
        currency: 'INR',
        lineItems: [
          {
            id: 'li_b_1',
            description: 'CNC Turned Brass Bushings 32mm OD',
            hsnSacCode: '7412',
            quantity: 500,
            unit: 'PCS',
            unitPrice: 169.4915,
            totalPrice: 84745.76,
            taxRatePercent: 18,
            taxAmount: 15254.24
          }
        ],
        subtotalAmount: 84745.76,
        taxAmount: 15254.24,
        discountAmount: 0,
        totalAmount: 100000,
        paymentTerms: '30 Days Net'
      }
    }
  };

  const paymentDoc: DocumentMetadata = {
    id: 'doc_scen_b_pay',
    fileName: 'NEFT_Bank_Advice_30000.pdf',
    fileSize: 164000,
    fileType: 'application/pdf',
    category: 'payment_receipt',
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'extracted',
    confidenceScore: 0.97,
    pageCount: 1,
    isVerifiedByUser: true,
    extractedFields: {
      payment: {
        transactionRef: 'NEFT-AXIS-20261019-9921',
        transactionDate: paymentDate,
        payerName: 'Bharat Heavy Dynamics Corporation',
        payeeName: 'Apex Castings & Machining LLP',
        amount: 30000,
        currency: 'INR',
        paymentMode: 'NEFT',
        matchedInvoiceRef: 'INV-2026-104',
        bankNarration: 'NEFT/BHDC/PARTIAL PMT INV-2026-104'
      }
    }
  };

  const paymentAllocation = {
    id: 'alloc_b_1',
    paymentDocId: paymentDoc.id,
    transactionRef: 'NEFT-AXIS-20261019-9921',
    transactionDate: paymentDate,
    payerName: 'Bharat Heavy Dynamics Corporation',
    totalPaymentAmount: 30000,
    allocatedAmount: 30000,
    targetInvoiceId: invoiceDoc.id,
    targetInvoiceNumber: 'INV-2026-104',
    status: 'confirmed' as const,
    matchConfidence: 0.99,
    matchExplanation: 'Transaction narration explicitly matches invoice number INV-2026-104 for ₹30,000 partial release.'
  };

  return {
    id: 'case_scen_b',
    caseReference: 'DG-2026-002',
    title: 'Apex Castings vs Bharat Heavy Dynamics',
    createdDate: new Date().toISOString().split('T')[0],
    asOfDate,
    isSyntheticDemo: true,
    demoScenarioId: 'B',
    supplierName: 'Apex Castings & Machining LLP',
    buyerName: 'Bharat Heavy Dynamics Corporation',
    documents: [invoiceDoc, paymentDoc],
    discrepancies: [],
    paymentAllocations: [paymentAllocation],
    financialSummaries: [
      {
        invoiceId: invoiceDoc.id,
        invoiceNumber: 'INV-2026-104',
        buyerName: 'Bharat Heavy Dynamics Corporation',
        invoiceDate,
        dueDate,
        totalAmount: 100000,
        confirmedPaymentsAllocated: 30000,
        applicableCredits: 0,
        validatedAdjustments: 0,
        outstandingPrincipal: 70000, // Deterministic: 1,00,000 - 30,000 = 70,000
        overdueDays: 15,
        isOverdue: true,
        paymentStatus: 'partially_paid',
        poMatchStatus: 'no_po_found',
        deliveryProofStatus: 'missing'
      }
    ],
    humanReview: {
      approvalStatus: 'Draft - Pending Review',
      signedOff: false
    },
    workflowStage: 'idle',
    stageLogs: getInitialStageLogs()
  };
}

/**
 * Generates Scenario C: Purchase Order Discrepancy
 * Invoice total: ₹85,000
 * Purchase order total: ₹80,000
 * Difference: ₹5,000
 * Payment status: Unverified
 */
export function createScenarioC(asOfDate: string): DisputeCase {
  const poDate = getRelativeDate(asOfDate, -40);
  const invoiceDate = getRelativeDate(asOfDate, -35);
  const dueDate = getRelativeDate(asOfDate, -5); // Due 5 days ago

  const poDoc: DocumentMetadata = {
    id: 'doc_scen_c_po',
    fileName: 'PO-IND-5501_Indus_Engg.pdf',
    fileSize: 220000,
    fileType: 'application/pdf',
    category: 'purchase_order',
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'extracted',
    confidenceScore: 0.98,
    pageCount: 1,
    isVerifiedByUser: true,
    extractedFields: {
      purchaseOrder: {
        poNumber: 'PO-IND-5501',
        buyerName: 'Indus Infrastructure & Equipments Ltd',
        supplierName: 'Vanguard Industrial Springs Pvt Ltd',
        orderDate: poDate,
        lineItems: [
          {
            id: 'li_c_po_1',
            description: 'Heavy Helical Compression Springs 12mm',
            quantity: 100,
            unit: 'PCS',
            unitPrice: 800,
            totalPrice: 80000,
            taxRatePercent: 0,
            taxAmount: 0
          }
        ],
        orderTotal: 80000,
        paymentTerms: 'Payment strictly within 30 days against agreed PO rate'
      }
    }
  };

  const invoiceDoc: DocumentMetadata = {
    id: 'doc_scen_c_inv',
    fileName: 'INV-2026-112_Springs_Billed.pdf',
    fileSize: 215000,
    fileType: 'application/pdf',
    category: 'tax_invoice',
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'extracted',
    confidenceScore: 0.98,
    pageCount: 1,
    isVerifiedByUser: true,
    extractedFields: {
      invoice: {
        invoiceNumber: 'INV-2026-112',
        supplierName: 'Vanguard Industrial Springs Pvt Ltd',
        supplierGstin: '29ABCDE1234F1Z5',
        supplierUdyam: 'UDYAM-KR-03-0091238',
        buyerName: 'Indus Infrastructure & Equipments Ltd',
        buyerGstin: '29AABCI5512L1ZO',
        invoiceDate,
        dueDate,
        purchaseOrderRef: 'PO-IND-5501',
        currency: 'INR',
        lineItems: [
          {
            id: 'li_c_inv_1',
            description: 'Heavy Helical Compression Springs 12mm',
            quantity: 100,
            unit: 'PCS',
            unitPrice: 850, // Discrepancy: 850 vs PO 800 (variance +50/unit)
            totalPrice: 85000,
            taxRatePercent: 0,
            taxAmount: 0
          }
        ],
        subtotalAmount: 85000,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 85000,
        paymentTerms: '30 Days Net'
      }
    }
  };

  return {
    id: 'case_scen_c',
    caseReference: 'DG-2026-003',
    title: 'Vanguard Springs vs Indus Infrastructure (PO Mismatch)',
    createdDate: new Date().toISOString().split('T')[0],
    asOfDate,
    isSyntheticDemo: true,
    demoScenarioId: 'C',
    supplierName: 'Vanguard Industrial Springs Pvt Ltd',
    buyerName: 'Indus Infrastructure & Equipments Ltd',
    documents: [poDoc, invoiceDoc],
    discrepancies: [
      {
        id: 'disc_c_po_1',
        category: 'po_mismatch',
        severity: 'critical',
        title: 'Purchase Order Total Mismatch (₹5,000 Rate Variance)',
        description: 'Invoice INV-2026-112 total (₹85,000) exceeds approved Purchase Order PO-IND-5501 (₹80,000) by ₹5,000. Unit rate billed at ₹850 vs agreed ₹800/unit.',
        sourceDocId: invoiceDoc.id,
        sourceDocName: invoiceDoc.fileName,
        expectedValue: 80000,
        actualValue: 85000,
        amountImpact: 5000,
        requiresHumanReview: true,
        isResolved: false
      }
    ],
    paymentAllocations: [],
    financialSummaries: [
      {
        invoiceId: invoiceDoc.id,
        invoiceNumber: 'INV-2026-112',
        buyerName: 'Indus Infrastructure & Equipments Ltd',
        invoiceDate,
        dueDate,
        totalAmount: 85000,
        confirmedPaymentsAllocated: 0,
        applicableCredits: 0,
        validatedAdjustments: 0,
        outstandingPrincipal: 85000,
        overdueDays: 5,
        isOverdue: true,
        paymentStatus: 'disputed',
        poMatchStatus: 'discrepancy',
        deliveryProofStatus: 'missing'
      }
    ],
    humanReview: {
      approvalStatus: 'Draft - Pending Review',
      signedOff: false
    },
    workflowStage: 'idle',
    stageLogs: getInitialStageLogs()
  };
}

export function getInitialStageLogs() {
  return {
    idle: {
      stage: 'idle' as const,
      agentName: 'Workflow Orchestrator',
      status: 'pending' as const,
      summary: 'Awaiting pipeline initiation.',
      details: ['Workflow initialized.'],
      canRetry: false
    },
    extraction: {
      stage: 'extraction' as const,
      agentName: 'Extraction Agent',
      status: 'pending' as const,
      summary: 'Pending document ingestion and field extraction.',
      details: [],
      canRetry: true
    },
    validation: {
      stage: 'validation' as const,
      agentName: 'Validation Agent',
      status: 'pending' as const,
      summary: 'Pending financial arithmetic and PO reconciliation.',
      details: [],
      canRetry: true
    },
    evidence: {
      stage: 'evidence' as const,
      agentName: 'Evidence Agent',
      status: 'pending' as const,
      summary: 'Pending MSMED Act documentation audit.',
      details: [],
      canRetry: true
    },
    report: {
      stage: 'report' as const,
      agentName: 'Report Agent',
      status: 'pending' as const,
      summary: 'Pending synthesis of dispute preparation report.',
      details: [],
      canRetry: true
    },
    human_approval: {
      stage: 'human_approval' as const,
      agentName: 'Human Approval Gate',
      status: 'pending' as const,
      summary: 'Pending reviewer sign-off.',
      details: [],
      canRetry: true
    },
    finalized: {
      stage: 'finalized' as const,
      agentName: 'Case Finalizer',
      status: 'pending' as const,
      summary: 'Pending export bundle generation.',
      details: [],
      canRetry: false
    }
  };
}
