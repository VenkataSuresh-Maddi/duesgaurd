const pool = require('./db');

async function runMigrations() {
  console.log('Running safe migrations...');

  // 1. users table: ensure reset token columns exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      reset_token_hash VARCHAR(255) DEFAULT NULL,
      reset_token_expires_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Non-destructive column additions for existing users table if they don't exist
  const [userCols] = await pool.query(`SHOW COLUMNS FROM users`);
  const userColNames = userCols.map(c => c.Field);
  if (!userColNames.includes('reset_token_hash')) {
    await pool.query(`ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255) DEFAULT NULL`);
  }
  if (!userColNames.includes('reset_token_expires_at')) {
    await pool.query(`ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMP NULL DEFAULT NULL`);
  }

  // 2. businesses table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      user_email VARCHAR(191) NOT NULL,
      business_name VARCHAR(150) NOT NULL,
      business_type VARCHAR(100) DEFAULT 'General',
      gstin VARCHAR(15) DEFAULT NULL,
      phone VARCHAR(50),
      address TEXT,
      state VARCHAR(100) DEFAULT 'Karnataka',
      pincode VARCHAR(20) DEFAULT NULL,
      invoice_prefix VARCHAR(10) DEFAULT 'INV',
      default_payment_terms_days INT DEFAULT 30,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [bizCols] = await pool.query(`SHOW COLUMNS FROM businesses`);
  const bizColNames = bizCols.map(c => c.Field);
  if (!bizColNames.includes('user_id')) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN user_id INT NULL AFTER id`);
  }
  if (!bizColNames.includes('gstin')) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN gstin VARCHAR(15) DEFAULT NULL AFTER business_type`);
  }
  if (!bizColNames.includes('state')) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN state VARCHAR(100) DEFAULT 'Karnataka' AFTER address`);
  }
  if (!bizColNames.includes('pincode')) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN pincode VARCHAR(20) DEFAULT NULL AFTER state`);
  }
  if (!bizColNames.includes('invoice_prefix')) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN invoice_prefix VARCHAR(10) DEFAULT 'INV' AFTER pincode`);
  }
  if (!bizColNames.includes('default_payment_terms_days')) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN default_payment_terms_days INT DEFAULT 30 AFTER invoice_prefix`);
  }

  // Sync user_id from user_email for existing business records
  await pool.query(`
    UPDATE businesses b
    JOIN users u ON LOWER(b.user_email) = LOWER(u.email)
    SET b.user_id = u.id
    WHERE b.user_id IS NULL;
  `);

  // 3. customers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(191) NOT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      billing_address TEXT DEFAULT NULL,
      shipping_address TEXT DEFAULT NULL,
      gstin VARCHAR(15) DEFAULT NULL,
      state VARCHAR(100) DEFAULT 'Karnataka',
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cust_biz (business_id),
      CONSTRAINT fk_customers_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. products table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      sku VARCHAR(60) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      unit VARCHAR(30) DEFAULT 'PCS',
      cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_prod_biz (business_id),
      CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. invoices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      customer_id INT NOT NULL,
      invoice_number VARCHAR(50) NOT NULL,
      invoice_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status ENUM('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'issued',
      place_of_supply VARCHAR(100) DEFAULT 'Intra-State',
      subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      total_cgst DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      total_sgst DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      total_igst DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      total_discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      grand_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      balance_due DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
      po_reference VARCHAR(100) DEFAULT NULL,
      pdf_path VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_biz_inv_number (business_id, invoice_number),
      INDEX idx_inv_biz (business_id),
      INDEX idx_inv_cust (customer_id),
      INDEX idx_inv_due_status (due_date, status),
      CONSTRAINT fk_invoices_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. invoice_items table (stores snapshot of name, price, tax)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      product_id INT NULL,
      product_name VARCHAR(150) NOT NULL,
      sku VARCHAR(60) DEFAULT NULL,
      unit VARCHAR(30) DEFAULT 'PCS',
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
      cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      INDEX idx_item_inv (invoice_id),
      CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 7. payments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      business_id INT NOT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
      reference_no VARCHAR(100) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pay_inv (invoice_id),
      INDEX idx_pay_biz (business_id),
      CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      CONSTRAINT fk_payments_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 8. documents table (uploads & evidence)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      invoice_id INT NULL,
      original_filename VARCHAR(255) NOT NULL,
      stored_filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      file_size INT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      document_type VARCHAR(50) DEFAULT 'invoice',
      extracted_data JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_doc_biz (business_id),
      INDEX idx_doc_inv (invoice_id),
      CONSTRAINT fk_documents_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 9. email_reminder_logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_reminder_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      invoice_id INT NOT NULL,
      customer_id INT NOT NULL,
      reminder_type VARCHAR(50) NOT NULL,
      recipient_email VARCHAR(191) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body_html MEDIUMTEXT,
      status ENUM('pending', 'sent', 'failed', 'mock_delivered') NOT NULL DEFAULT 'pending',
      provider_message_id VARCHAR(255) DEFAULT NULL,
      attempts INT DEFAULT 1,
      error_message TEXT DEFAULT NULL,
      sent_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rem_biz (business_id),
      INDEX idx_rem_inv (invoice_id),
      INDEX idx_rem_type (invoice_id, reminder_type),
      CONSTRAINT fk_rem_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      CONSTRAINT fk_rem_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 10. dispute_cases table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispute_cases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      invoice_id INT NOT NULL,
      case_number VARCHAR(50) NOT NULL,
      status ENUM('draft', 'evidence_gathering', 'ready_for_filing', 'filed', 'resolved') DEFAULT 'draft',
      total_claimed DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      msme_samadhaan_ready TINYINT(1) DEFAULT 0,
      evidence_checklist JSON DEFAULT NULL,
      narrative TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dispute_biz (business_id),
      INDEX idx_dispute_inv (invoice_id),
      CONSTRAINT fk_dispute_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      CONSTRAINT fk_dispute_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 11. case_evidence table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_evidence (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispute_case_id INT NOT NULL,
      document_id INT NOT NULL,
      evidence_type VARCHAR(50) DEFAULT 'Invoice',
      verified_by_agent TINYINT(1) DEFAULT 0,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_case_evidence_case (dispute_case_id),
      CONSTRAINT fk_ce_case FOREIGN KEY (dispute_case_id) REFERENCES dispute_cases(id) ON DELETE CASCADE,
      CONSTRAINT fk_ce_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 12. ai_analysis table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      invoice_id INT NULL,
      dispute_case_id INT NULL,
      agent_name VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'completed',
      summary TEXT,
      findings JSON DEFAULT NULL,
      action_required TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ai_biz (business_id),
      INDEX idx_ai_inv (invoice_id),
      CONSTRAINT fk_ai_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('Safe migrations completed successfully without data loss.');
}

module.exports = runMigrations;

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
