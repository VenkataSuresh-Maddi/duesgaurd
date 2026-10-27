const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extracts invoice metadata and potential line items from digital PDF buffer or text
 */
async function extractInvoiceFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text || '';

  // Heuristic rule-based regex extraction
  const extracted = {
    invoice_number: null,
    invoice_date: null,
    due_date: null,
    customer_name: null,
    customer_gstin: null,
    subtotal: null,
    total_tax: null,
    grand_total: null,
    raw_text_snippet: text.slice(0, 1500),
    confidence: {
      invoice_number: 'low',
      dates: 'low',
      totals: 'low'
    }
  };

  // Invoice Number Matcher (e.g. Inv #: INV-2026-001, Invoice No: 12345)
  const invMatch = text.match(/(?:invoice\s*(?:no|num|number|#)?[:\s]+)([A-Za-z0-9\-\/]+)/i);
  if (invMatch && invMatch[1]) {
    extracted.invoice_number = invMatch[1].trim();
    extracted.confidence.invoice_number = 'high';
  }

  // GSTIN Matcher (15 alphanumeric characters: 2 digits + 10 chars PAN + 1 + Z + 1)
  const gstinMatches = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g);
  if (gstinMatches && gstinMatches.length > 0) {
    extracted.customer_gstin = gstinMatches[0];
  }

  // Date Matchers (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
  const dateMatches = text.match(/\b(\d{1,4}[-\/]\d{1,2}[-\/]\d{2,4})\b/g);
  if (dateMatches && dateMatches.length > 0) {
    extracted.invoice_date = parseFlexibleDate(dateMatches[0]);
    if (dateMatches.length > 1) {
      extracted.due_date = parseFlexibleDate(dateMatches[1]);
    }
    extracted.confidence.dates = 'medium';
  }

  // Grand Total Matcher (Total: INR 1,234.50 or Grand Total: 5000)
  const totalMatch = text.match(/(?:grand\s+total|total\s+amount|net\s+total|total)[:\s]+(?:inr|rs\.?|₹)?\s*([\d,]+\.?\d*)/i);
  if (totalMatch && totalMatch[1]) {
    const rawVal = totalMatch[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    if (!isNaN(num)) {
      extracted.grand_total = num;
      extracted.confidence.totals = 'medium';
    }
  }

  return extracted;
}

function parseFlexibleDate(str) {
  try {
    const parts = str.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

module.exports = { extractInvoiceFromPdf };
