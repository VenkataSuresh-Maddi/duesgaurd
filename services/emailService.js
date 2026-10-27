const nodemailer = require('nodemailer');
const pool = require('../db');

/**
 * Configure email transporter
 * Supports:
 * 1. Resend (HTTP or SMTP)
 * 2. Custom SMTP
 * 3. Mock test transporter (stores in memory / DB logs)
 */
function createTransporter() {
  const provider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();

  if (provider === 'smtp' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Resend SMTP fallback if credentials are provided
  if (provider === 'resend' && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'replace_with_api_key') {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    });
  }

  // Safe Mock Delivery Transporter for development & testing
  return {
    isMock: true,
    async sendMail(mailOptions) {
      console.log(`[MOCK EMAIL SENT] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
      return {
        messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        response: '250 Mock delivery accepted'
      };
    }
  };
}

const transporter = createTransporter();

function buildEmailHtml({ businessName, customerName, invoiceNumber, invoiceDate, dueDate, grandTotal, amountPaid, balanceDue, daysOverdue }) {
  const isOverdue = daysOverdue > 0;
  const statusColor = isOverdue ? '#dc2626' : '#2563eb';
  const statusLabel = isOverdue ? `OVERDUE BY ${daysOverdue} DAYS` : 'PAYMENT DUE REMINDER';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
      .header { background: #0f172a; padding: 28px; color: #ffffff; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
      .badge { display: inline-block; padding: 6px 14px; background: ${statusColor}; color: #ffffff; font-size: 11px; font-weight: 700; border-radius: 9999px; margin-top: 10px; letter-spacing: 0.5px; }
      .content { padding: 32px 28px; }
      .amount-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
      .amount-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
      .amount-card .val { font-size: 28px; color: #0f172a; font-weight: 800; margin-top: 4px; }
      .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
      .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
      .details-table td:last-child { text-align: right; font-weight: 600; color: #334155; }
      .msme-notice { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 24px 0; font-size: 12px; color: #991b1b; line-height: 1.5; }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${businessName}</h1>
        <div class="badge">${statusLabel}</div>
      </div>
      <div class="content">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>This is a reminder regarding outstanding payment for Invoice <strong>${invoiceNumber}</strong> issued by <strong>${businessName}</strong>.</p>
        
        <div class="amount-card">
          <div class="label">Outstanding Balance Due</div>
          <div class="val">₹ ${Number(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>

        <table class="details-table">
          <tr><td>Invoice Number:</td><td>${invoiceNumber}</td></tr>
          <tr><td>Invoice Date:</td><td>${new Date(invoiceDate).toLocaleDateString('en-IN')}</td></tr>
          <tr><td>Due Date:</td><td>${new Date(dueDate).toLocaleDateString('en-IN')}</td></tr>
          <tr><td>Total Billed:</td><td>₹ ${Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Payments Received:</td><td>₹ ${Number(amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
        </table>

        <div class="msme-notice">
          <strong>Notice under MSMED Act (2006):</strong> Supplies to registered MSME entities must be settled within the statutory limit. Continued delay incurs compound interest at three times the RBI rate.
        </div>

        <p>Please arrange payment at your earliest convenience or contact our accounts team if you have questions or have already initiated the transfer.</p>
        <p>Sincerely,<br><strong>${businessName} Finance & Billing</strong></p>
      </div>
      <div class="footer">
        Powered by DuesGuard AI MSME Payment Intelligence Platform.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends a single reminder email, logging the durable record to email_reminder_logs
 */
async function sendInvoiceReminder({ businessId, invoiceId, customerId, recipientEmail, subject, reminderType, emailData }) {
  const fromAddress = process.env.EMAIL_FROM || 'notifications@duesguard.com';
  const html = buildEmailHtml(emailData);

  let status = 'pending';
  let messageId = null;
  let errorMessage = null;

  try {
    const result = await transporter.sendMail({
      from: `"${emailData.businessName}" <${fromAddress}>`,
      to: recipientEmail,
      subject: subject,
      html: html
    });

    status = transporter.isMock ? 'mock_delivered' : 'sent';
    messageId = result.messageId;
  } catch (err) {
    status = 'failed';
    errorMessage = err.message;
    console.error('Email send error:', err);
  }

  // Persist log in MySQL
  const [logResult] = await pool.query(`
    INSERT INTO email_reminder_logs 
    (business_id, invoice_id, customer_id, reminder_type, recipient_email, subject, body_html, status, provider_message_id, attempts, error_message, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ${status === 'failed' ? 'NULL' : 'NOW()'})
  `, [businessId, invoiceId, customerId, reminderType, recipientEmail, subject, html, status, messageId, errorMessage]);

  return { success: status !== 'failed', logId: logResult.insertId, status, messageId, error: errorMessage };
}

module.exports = {
  sendInvoiceReminder,
  buildEmailHtml
};
