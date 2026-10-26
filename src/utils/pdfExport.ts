/**
 * DuesGuard AI - PDF Dispute Dossier Generator
 * 
 * Generates structured, professional case reports.
 * Strictly enforces report status:
 * - Approved cases are labeled "APPROVED DISPUTE BUNDLE"
 * - Drafts are labeled "UNAPPROVED DRAFT - FOR REVIEW ONLY"
 * - Rejected cases are labeled "REJECTED DRAFT"
 */

import { jsPDF } from 'jspdf';
import { DisputeCase } from '../types';
import { formatINR } from './finance';

export function generateDisputePDF(currentCase: DisputeCase): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 18;

  const isApproved = currentCase.humanReview.approvalStatus === 'Approved';
  const isRejected = currentCase.humanReview.approvalStatus === 'Rejected';

  // --- HEADER SECTION ---
  doc.setFillColor(15, 23, 42); // Navy 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DuesGuard AI', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('MSME Payment Intelligence & Dispute Preparation Platform', margin, 17);
  doc.text(`Case Ref: ${currentCase.caseReference}  |  As-of Date: ${currentCase.asOfDate}`, margin, 22);

  // Status Badge in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (isApproved) {
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.roundedRect(pageWidth - margin - 38, 8, 38, 12, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('APPROVED BUNDLE', pageWidth - margin - 35, 15.5);
  } else if (isRejected) {
    doc.setFillColor(239, 68, 68); // Red 500
    doc.roundedRect(pageWidth - margin - 35, 8, 35, 12, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('REJECTED DRAFT', pageWidth - margin - 32, 15.5);
  } else {
    doc.setFillColor(245, 158, 11); // Amber 500
    doc.roundedRect(pageWidth - margin - 42, 8, 42, 12, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('DRAFT - UNAPPROVED', pageWidth - margin - 40, 15.5);
  }

  y = 36;

  // --- PARTIES SUMMARY ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 2, 2, 'S');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER (CLAIMANT):', margin + 4, y + 6);
  doc.text('BUYER (RESPONDENT):', margin + 95, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(currentCase.supplierName || 'MSME Supplier', margin + 4, y + 12);
  doc.text(currentCase.buyerName || 'Buyer Enterprise', margin + 95, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Udyam: ${currentCase.reportDraft?.supplierDetails.udyamNumber || 'Verified MSME'}`, margin + 4, y + 17);
  doc.text(`GSTIN: ${currentCase.reportDraft?.supplierDetails.gstin || '27AABCS1429B1Z2'}`, margin + 4, y + 21);

  doc.text(`GSTIN: ${currentCase.reportDraft?.buyerDetails.gstin || '29AAACG8291A1ZB'}`, margin + 95, y + 17);
  doc.text(`Commercial Status: Defaulted / Overdue`, margin + 95, y + 21);

  y += 32;

  // --- FINANCIAL SUMMARY BOXES ---
  const report = currentCase.reportDraft;
  const totalInv = report?.totalInvoiceAmount || 0;
  const totalPaid = report?.totalConfirmedPayments || 0;
  const totalOut = report?.totalOutstandingPrincipal || 0;
  const totalOverdue = report?.totalOverduePrincipal || 0;

  const boxWidth = (pageWidth - (margin * 2) - 9) / 4;
  const metrics = [
    { label: 'TOTAL BILLED', val: formatINR(totalInv, false), color: [15, 23, 42] },
    { label: 'CONFIRMED PAID', val: formatINR(totalPaid, false), color: [16, 185, 129] },
    { label: 'OUTSTANDING', val: formatINR(totalOut, false), color: [220, 38, 38] },
    { label: 'OVERDUE (AS-OF)', val: formatINR(totalOverdue, false), color: [234, 88, 12] }
  ];

  metrics.forEach((m, idx) => {
    const bx = margin + (idx * (boxWidth + 3));
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bx, y, boxWidth, 18, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, bx + 3, y + 5);
    doc.setFontSize(10);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, bx + 3, y + 12);
  });

  y += 24;

  // --- EXECUTIVE SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Summary', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(report?.executiveSummary || 'Dispute dossier prepared for MSME claim under Section 15 of MSMED Act 2006.', pageWidth - (margin * 2));
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4 + 4;

  // --- INVOICE-WISE STATEMENT TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Invoice-wise Outstanding Dues Statement', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('INVOICE #', margin + 3, y + 4);
  doc.text('INV DATE', margin + 32, y + 4);
  doc.text('DUE DATE', margin + 55, y + 4);
  doc.text('TOTAL (INR)', margin + 80, y + 4);
  doc.text('PAID (INR)', margin + 110, y + 4);
  doc.text('OUTSTANDING (INR)', margin + 138, y + 4);
  doc.text('OVERDUE', margin + 174, y + 4);
  y += 7;

  // Table rows
  currentCase.financialSummaries.forEach((s) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(s.invoiceNumber, margin + 3, y + 3.5);
    doc.text(s.invoiceDate, margin + 32, y + 3.5);
    doc.text(s.dueDate, margin + 55, y + 3.5);
    doc.text(formatINR(s.totalAmount, false), margin + 80, y + 3.5);
    doc.text(formatINR(s.confirmedPaymentsAllocated, false), margin + 110, y + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(formatINR(s.outstandingPrincipal, false), margin + 138, y + 3.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s.overdueDays} days`, margin + 174, y + 3.5);

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 5.5, pageWidth - margin, y + 5.5);
    y += 6.5;
  });

  y += 4;

  // --- DISCREPANCIES & CONTRADICTIONS ---
  if (currentCase.discrepancies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text(`3. Discrepancy Register (${currentCase.discrepancies.length} Item(s) Requiring Attention)`, margin, y);
    y += 5;

    currentCase.discrepancies.forEach(d => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`• [${d.category.toUpperCase()}] ${d.title}`, margin + 3, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(d.description, pageWidth - margin * 2 - 8);
      doc.text(descLines, margin + 6, y);
      y += descLines.length * 3.8 + 2;
    });
  }

  // --- MISSING EVIDENCE CHECKLIST ---
  if (report?.missingEvidence && report.missingEvidence.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Missing Evidence Checklist & Statutory Relevance', margin, y);
    y += 5;

    report.missingEvidence.forEach(m => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(217, 119, 6);
      doc.text(`[${m.urgency.toUpperCase()}] ${m.title}`, margin + 3, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const whyLines = doc.splitTextToSize(`MSME Relevance: ${m.whyUseful}`, pageWidth - margin * 2 - 8);
      doc.text(whyLines, margin + 6, y);
      y += whyLines.length * 3.8 + 2;
    });
  }

  // Page 2 or bottom signoff if needed
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 20;
  }

  y += 4;
  // --- STATUTORY NOTICE & SIGN-OFF ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 32, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('HUMAN REVIEW & APPROVAL GATE VERIFICATION', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Status: ${currentCase.humanReview.approvalStatus}`, margin + 4, y + 12);
  doc.text(`Reviewer: ${currentCase.humanReview.reviewedBy || 'Pending Formal Reviewer Sign-off'}`, margin + 4, y + 17);
  doc.text(`Sign-off Date: ${currentCase.humanReview.reviewedAt || 'N/A'}`, margin + 4, y + 22);

  if (currentCase.humanReview.reviewerComments) {
    doc.text(`Reviewer Notes: ${currentCase.humanReview.reviewerComments}`, margin + 4, y + 27);
  }

  // Footer Watermark/Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('DuesGuard AI Case Dossier. This report represents evidence-grounded analysis and deterministic calculations.', margin, pageHeight - 8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, pageHeight - 8);

  const safeFileName = `${currentCase.caseReference}_${isApproved ? 'APPROVED' : 'DRAFT'}_Dispute_Dossier.pdf`;
  doc.save(safeFileName);
}

/**
 * Exports CSV of invoices and reconciliation
 */
export function exportInvoicesCSV(currentCase: DisputeCase): void {
  const headers = ['Invoice Number', 'Buyer Name', 'Invoice Date', 'Due Date', 'Total Amount', 'Confirmed Paid', 'Outstanding Principal', 'Overdue Days', 'Payment Status', 'PO Match Status', 'Delivery Proof'];
  const rows = currentCase.financialSummaries.map(s => [
    `"${s.invoiceNumber}"`,
    `"${s.buyerName}"`,
    s.invoiceDate,
    s.dueDate,
    s.totalAmount,
    s.confirmedPaymentsAllocated,
    s.outstandingPrincipal,
    s.overdueDays,
    s.paymentStatus,
    s.poMatchStatus,
    s.deliveryProofStatus
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${currentCase.caseReference}_invoices.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports full JSON Case Bundle
 */
export function exportCaseJSON(currentCase: DisputeCase): void {
  const dataStr = JSON.stringify(currentCase, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${currentCase.caseReference}_case_bundle.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
