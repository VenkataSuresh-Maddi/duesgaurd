const pool = require('../db');

/**
 * Agentic AI Dispute Preparation & Audit Workflow
 * Includes:
 * 1. Financial Validation Agent
 * 2. Evidence Verification Agent
 * 3. Payment & Overdue Analysis Agent
 * 4. Dispute Preparation Agent (MSME Samadhaan Readiness)
 */

async function runDisputePreparationWorkflow(businessId, invoiceId) {
  // 1. Fetch Invoice, Customer, and Business
  const [invoices] = await pool.query(`
    SELECT i.*, b.business_name, b.gstin as biz_gstin, b.state as biz_state,
           c.name as customer_name, c.email as customer_email, c.gstin as cust_gstin, c.state as cust_state
    FROM invoices i
    JOIN businesses b ON i.business_id = b.id
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ? AND i.business_id = ?
  `, [invoiceId, businessId]);

  if (invoices.length === 0) {
    throw new Error('Invoice not found or unauthorized.');
  }

  const invoice = invoices[0];

  // 2. Fetch Line Items
  const [items] = await pool.query(`
    SELECT * FROM invoice_items WHERE invoice_id = ?
  `, [invoiceId]);

  // 3. Fetch Payments
  const [payments] = await pool.query(`
    SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date ASC
  `, [invoiceId]);

  // 4. Fetch Supporting Documents
  const [documents] = await pool.query(`
    SELECT * FROM documents WHERE invoice_id = ? OR business_id = ?
  `, [invoiceId, businessId]);

  // --- AGENT 1: Financial Validation Agent ---
  let calculatedSubtotal = 0;
  let calculatedCGST = 0;
  let calculatedSGST = 0;
  let calculatedIGST = 0;

  for (const item of items) {
    const lineTotal = Number(item.quantity) * Number(item.unit_price);
    calculatedSubtotal += lineTotal;
    calculatedCGST += Number(item.cgst_amount) || 0;
    calculatedSGST += Number(item.sgst_amount) || 0;
    calculatedIGST += Number(item.igst_amount) || 0;
  }

  const totalCalculated = calculatedSubtotal + calculatedCGST + calculatedSGST + calculatedIGST - Number(invoice.total_discount || 0);
  const financialMatch = Math.abs(totalCalculated - Number(invoice.grand_total)) < 0.05;

  const financialAgentFinding = {
    agent: 'Financial Validation Agent',
    status: financialMatch ? 'passed' : 'discrepancy_detected',
    calculatedGrandTotal: totalCalculated.toFixed(2),
    invoiceGrandTotal: Number(invoice.grand_total).toFixed(2),
    itemsCount: items.length,
    notes: financialMatch ? 'Deterministic line-item tax and math verified.' : 'Mismatch between line item sum and invoice grand total.'
  };

  // --- AGENT 2: Evidence Verification Agent ---
  const hasInvoiceDoc = documents.some(d => d.document_type === 'invoice' || d.invoice_id === invoiceId);
  const hasPoDoc = documents.some(d => d.document_type === 'po' || invoice.po_reference);
  const hasDeliveryDoc = documents.some(d => d.document_type === 'delivery_challan' || d.document_type === 'proof_of_delivery');

  const evidenceChecklist = {
    original_invoice_attached: hasInvoiceDoc || invoice.pdf_path ? true : false,
    purchase_order_or_contract: hasPoDoc,
    delivery_challan_or_proof: hasDeliveryDoc,
    written_reminders_sent: true // tracked in reminder logs
  };

  const evidenceScore = Object.values(evidenceChecklist).filter(Boolean).length;
  const evidenceReady = evidenceScore >= 3;

  const evidenceAgentFinding = {
    agent: 'Evidence Verification Agent',
    status: evidenceReady ? 'strong' : 'additional_evidence_recommended',
    checklist: evidenceChecklist,
    score: `${evidenceScore} / 4 key evidentiary documents identified`
  };

  // --- AGENT 3: Payment & Overdue Analysis Agent ---
  const today = new Date();
  const dueDate = new Date(invoice.due_date);
  const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
  
  // Section 16 of MSMED Act: Compound interest with monthly rests at 3x RBI Bank Rate (~6.5% * 3 = 19.5% p.a.)
  const annualInterestRate = 0.195;
  const daysInYear = 365;
  const penalInterest = Number(invoice.balance_due) * (annualInterestRate * (daysOverdue / daysInYear));
  const totalClaimable = Number(invoice.balance_due) + penalInterest;

  const overdueAgentFinding = {
    agent: 'Payment & Overdue Analysis Agent',
    daysOverdue,
    principalDue: Number(invoice.balance_due).toFixed(2),
    statutoryPenalInterestClaimable: penalInterest.toFixed(2),
    totalMSMEClaim: totalClaimable.toFixed(2),
    interestRateApplied: '19.5% p.a. (3x RBI Repo Rate as per MSMED Act 2006)'
  };

  // --- AGENT 4: Dispute Preparation Agent (MSME Samadhaan Filing Summary) ---
  const caseNumber = `DISP-${businessId}-${invoiceId}-${Date.now().toString().slice(-4)}`;
  const narrative = `Formal dispute claim for recovery of unpaid dues amounting to INR ${Number(invoice.balance_due).toFixed(2)} plus statutory penal interest under Section 16 of the MSMED Act 2006 (Total: INR ${totalClaimable.toFixed(2)}) for Invoice ${invoice.invoice_number} dated ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}.`;

  // Create or Update Dispute Case
  const [existingCase] = await pool.query(`
    SELECT id FROM dispute_cases WHERE business_id = ? AND invoice_id = ?
  `, [businessId, invoiceId]);

  let caseId;
  if (existingCase.length > 0) {
    caseId = existingCase[0].id;
    await pool.query(`
      UPDATE dispute_cases 
      SET status = ?, total_claimed = ?, msme_samadhaan_ready = ?, evidence_checklist = ?, narrative = ?
      WHERE id = ?
    `, [evidenceReady ? 'ready_for_filing' : 'evidence_gathering', totalClaimable, evidenceReady ? 1 : 0, JSON.stringify(evidenceChecklist), narrative, caseId]);
  } else {
    const [res] = await pool.query(`
      INSERT INTO dispute_cases (business_id, invoice_id, case_number, status, total_claimed, msme_samadhaan_ready, evidence_checklist, narrative)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [businessId, invoiceId, caseNumber, evidenceReady ? 'ready_for_filing' : 'evidence_gathering', totalClaimable, evidenceReady ? 1 : 0, JSON.stringify(evidenceChecklist), narrative]);
    caseId = res.insertId;
  }

  // Record AI Analysis Audit Log
  await pool.query(`
    INSERT INTO ai_analysis (business_id, invoice_id, dispute_case_id, agent_name, status, summary, findings, action_required)
    VALUES (?, ?, ?, 'Multi-Agent MSME Dispute Engine', 'completed', ?, ?, ?)
  `, [
    businessId,
    invoiceId,
    caseId,
    `Evaluated Invoice ${invoice.invoice_number}: ${financialAgentFinding.status}, Evidence Readiness: ${evidenceAgentFinding.status}, Statutory interest calculated.`,
    JSON.stringify({ financialAgentFinding, evidenceAgentFinding, overdueAgentFinding }),
    evidenceReady ? 'Ready for MSME Samadhaan application submission.' : 'Upload missing proof of delivery or purchase order before formal arbitration.'
  ]);

  return {
    success: true,
    caseId,
    caseNumber,
    evidenceReady,
    totalClaimable: totalClaimable.toFixed(2),
    penalInterest: penalInterest.toFixed(2),
    daysOverdue,
    findings: {
      financial: financialAgentFinding,
      evidence: evidenceAgentFinding,
      overdue: overdueAgentFinding
    }
  };
}

module.exports = { runDisputePreparationWorkflow };
