const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoicePdf(invoice, business, customer, items, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    // Header & Brand
    doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text('TAX INVOICE', 40, 40);
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Original for Recipient', 40, 68);

    // Business (Supplier) Details
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(business.business_name || 'Business Name', 40, 95);
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    if (business.address) doc.text(business.address, 40, 112);
    doc.text(`State: ${business.state || 'Karnataka'} | PIN: ${business.pincode || 'N/A'}`);
    if (business.gstin) doc.text(`GSTIN: ${business.gstin}`);
    if (business.phone) doc.text(`Phone: ${business.phone}`);

    // Invoice Meta
    const metaX = 350;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(`Invoice #: ${invoice.invoice_number}`, metaX, 95);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`, metaX, 112);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`, metaX, 126);
    doc.text(`Place of Supply: ${invoice.place_of_supply || 'Intra-State'}`, metaX, 140);
    if (invoice.po_reference) doc.text(`PO Ref: ${invoice.po_reference}`, metaX, 154);

    // Customer (Bill To)
    doc.rect(40, 180, 515, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text('BILL TO:', 50, 188);
    doc.fillColor('#0f172a').fontSize(10).text(customer.name, 50, 202);
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    const custSub = `${customer.billing_address || 'Address N/A'} | State: ${customer.state || 'Karnataka'} | Phone: ${customer.phone || 'N/A'}`;
    doc.text(custSub, 50, 216);
    if (customer.gstin) doc.text(`GSTIN: ${customer.gstin}`, 50, 228);

    // Table Header
    let y = 255;
    doc.rect(40, y, 515, 22).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Item Description', 48, y + 6);
    doc.text('Qty', 230, y + 6, { width: 40, align: 'right' });
    doc.text('Unit Price', 280, y + 6, { width: 65, align: 'right' });
    doc.text('GST %', 355, y + 6, { width: 45, align: 'right' });
    doc.text('Tax', 410, y + 6, { width: 55, align: 'right' });
    doc.text('Total (INR)', 475, y + 6, { width: 75, align: 'right' });

    y += 26;
    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    // Table Rows
    items.forEach((item, index) => {
      const bg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, y - 4, 515, 20).fill(bg);
      doc.fillColor('#1e293b');

      const taxAmount = (Number(item.cgst_amount) || 0) + (Number(item.sgst_amount) || 0) + (Number(item.igst_amount) || 0);

      doc.text(item.product_name, 48, y, { width: 175, lineBreak: false });
      doc.text(Number(item.quantity).toFixed(2), 230, y, { width: 40, align: 'right' });
      doc.text(Number(item.unit_price).toFixed(2), 280, y, { width: 65, align: 'right' });
      doc.text(`${Number(item.gst_rate)}%`, 355, y, { width: 45, align: 'right' });
      doc.text(taxAmount.toFixed(2), 410, y, { width: 55, align: 'right' });
      doc.text(Number(item.total_amount).toFixed(2), 475, y, { width: 75, align: 'right' });

      y += 20;
    });

    // Totals Section
    y += 10;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 8;

    const totalsX = 350;
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    
    doc.text('Subtotal:', totalsX, y);
    doc.text(`INR ${Number(invoice.subtotal).toFixed(2)}`, 475, y, { width: 75, align: 'right' });
    y += 15;

    if (Number(invoice.total_cgst) > 0) {
      doc.text('CGST:', totalsX, y);
      doc.text(`INR ${Number(invoice.total_cgst).toFixed(2)}`, 475, y, { width: 75, align: 'right' });
      y += 15;
    }
    if (Number(invoice.total_sgst) > 0) {
      doc.text('SGST:', totalsX, y);
      doc.text(`INR ${Number(invoice.total_sgst).toFixed(2)}`, 475, y, { width: 75, align: 'right' });
      y += 15;
    }
    if (Number(invoice.total_igst) > 0) {
      doc.text('IGST:', totalsX, y);
      doc.text(`INR ${Number(invoice.total_igst).toFixed(2)}`, 475, y, { width: 75, align: 'right' });
      y += 15;
    }
    if (Number(invoice.total_discount) > 0) {
      doc.text('Discount:', totalsX, y);
      doc.text(`- INR ${Number(invoice.total_discount).toFixed(2)}`, 475, y, { width: 75, align: 'right' });
      y += 15;
    }

    doc.rect(totalsX - 10, y - 2, 215, 22).fill('#f1f5f9');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Grand Total:', totalsX, y + 4);
    doc.text(`INR ${Number(invoice.grand_total).toFixed(2)}`, 475, y + 4, { width: 75, align: 'right' });
    y += 28;

    doc.fontSize(9).font('Helvetica').fillColor('#166534');
    doc.text('Amount Paid:', totalsX, y);
    doc.text(`INR ${Number(invoice.amount_paid).toFixed(2)}`, 475, y, { width: 75, align: 'right' });
    y += 15;

    doc.font('Helvetica-Bold').fillColor('#b91c1c');
    doc.text('Balance Due:', totalsX, y);
    doc.text(`INR ${Number(invoice.balance_due).toFixed(2)}`, 475, y, { width: 75, align: 'right' });

    // Payment Terms / MSME Note
    doc.fillColor('#64748b').fontSize(8).font('Helvetica');
    const footerY = 740;
    doc.text('MSME Samadhaan Compliance Notice: According to Chapter V of the MSMED Act 2006, payments must be cleared within 45 days. Delayed payments are subject to compound interest at three times the RBI bank rate.', 40, footerY, { width: 515 });
    doc.text(`Generated securely by DuesGuard AI • ${new Date().toLocaleString()}`, 40, footerY + 25, { width: 515, align: 'center' });

    doc.end();

    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', reject);
  });
}

module.exports = { generateInvoicePdf };
