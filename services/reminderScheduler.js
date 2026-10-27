const pool = require('../db');
const { sendInvoiceReminder } = require('./emailService');

/**
 * Background Overdue Checker
 * Checks for:
 * 1. reminder_upcoming: 3 days before due date
 * 2. reminder_due_today: on due date
 * 3. reminder_overdue_1: 1 day after due date
 * 4. reminder_overdue_7: 7 days after due date
 * 5. reminder_overdue_15: 15+ days after due date
 */
async function processOverdueReminders() {
  console.log('[REMINDER CRON] Checking invoices for reminder eligibility...');

  try {
    // Update overdue invoice status automatically in database
    await pool.query(`
      UPDATE invoices 
      SET status = 'overdue' 
      WHERE status IN ('issued', 'partially_paid') 
        AND due_date < CURDATE() 
        AND balance_due > 0.01;
    `);

    // Fetch active candidates
    const [invoices] = await pool.query(`
      SELECT 
        i.id AS invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.grand_total,
        i.amount_paid,
        i.balance_due,
        i.status,
        DATEDIFF(CURDATE(), i.due_date) AS days_difference,
        b.id AS business_id,
        b.business_name,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email
      FROM invoices i
      JOIN businesses b ON i.business_id = b.id
      JOIN customers c ON i.customer_id = c.id
      WHERE i.balance_due > 0.01 
        AND i.status NOT IN ('draft', 'paid', 'cancelled')
        AND c.email IS NOT NULL AND c.email != ''
    `);

    let dispatchedCount = 0;

    for (const inv of invoices) {
      const diff = inv.days_difference; // > 0 means overdue, < 0 means future
      let reminderType = null;
      let subject = '';

      if (diff === -3) {
        reminderType = 'upcoming_3d';
        subject = `Upcoming Payment Notice: Invoice ${inv.invoice_number} from ${inv.business_name}`;
      } else if (diff === 0) {
        reminderType = 'due_today';
        subject = `Payment Due Today: Invoice ${inv.invoice_number} from ${inv.business_name}`;
      } else if (diff === 1) {
        reminderType = 'overdue_1d';
        subject = `Payment Overdue: Invoice ${inv.invoice_number} - ${inv.business_name}`;
      } else if (diff === 7) {
        reminderType = 'overdue_7d';
        subject = `Urgent Follow-up (7 Days Overdue): Invoice ${inv.invoice_number}`;
      } else if (diff >= 15 && diff % 7 === 1) { // escalate weekly after 15 days
        reminderType = `overdue_${diff}d_escalation`;
        subject = `Formal Notice: Invoice ${inv.invoice_number} (${diff} Days Overdue) - MSME Compliance`;
      }

      if (!reminderType) continue;

      // Idempotency: Check if this specific reminder type was already sent for this invoice
      const [existing] = await pool.query(`
        SELECT id FROM email_reminder_logs 
        WHERE invoice_id = ? AND reminder_type = ? AND status IN ('sent', 'mock_delivered')
      `, [inv.invoice_id, reminderType]);

      if (existing.length > 0) {
        continue; // Already sent, skip
      }

      await sendInvoiceReminder({
        businessId: inv.business_id,
        invoiceId: inv.invoice_id,
        customerId: inv.customer_id,
        recipientEmail: inv.customer_email,
        subject: subject,
        reminderType: reminderType,
        emailData: {
          businessName: inv.business_name,
          customerName: inv.customer_name,
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          grandTotal: inv.grand_total,
          amountPaid: inv.amount_paid,
          balanceDue: inv.balance_due,
          daysOverdue: Math.max(0, diff)
        }
      });

      dispatchedCount++;
    }

    console.log(`[REMINDER CRON] Completed check. Dispatched ${dispatchedCount} reminders.`);
    return { success: true, dispatchedCount };
  } catch (err) {
    console.error('[REMINDER CRON] Error executing reminder cycle:', err);
    return { success: false, error: err.message };
  }
}

// Start recurring job every 60 minutes in Node.js
function startScheduler() {
  console.log('[SCHEDULER] Background reminder worker initialized (Running every hour).');
  // Run once on startup (after 5s delay for DB warmup)
  setTimeout(() => {
    processOverdueReminders().catch(console.error);
  }, 5000);

  setInterval(() => {
    processOverdueReminders().catch(console.error);
  }, 60 * 60 * 1000);
}

module.exports = {
  processOverdueReminders,
  startScheduler
};
