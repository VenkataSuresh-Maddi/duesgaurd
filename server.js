const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

require('dotenv').config();

const pool = require('./db');
const runMigrations = require('./migrations');
const { generateInvoicePdf } = require('./services/pdfService');
const { extractInvoiceFromPdf } = require('./services/extractionService');
const { sendInvoiceReminder } = require('./services/emailService');
const { processOverdueReminders, startScheduler } = require('./services/reminderScheduler');
const { runDisputePreparationWorkflow } = require('./services/aiDisputeService');

const app = express();
const port = process.env.PORT || 3000;

const os = require('os');

// Ensure upload & invoices directories exist (use os.tmpdir() on serverless Vercel)
const isServerless = !!process.env.VERCEL;
const uploadDir = isServerless ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
const pdfDir = isServerless ? path.join(os.tmpdir(), 'generated_invoices') : path.join(__dirname, 'generated_invoices');

try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
} catch (err) {
  console.warn('Directory creation warning (ignoring on read-only serverless):', err.message);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store Configuration
// On Vercel without external cloud MySQL host, default to memory store to prevent uncaught pool crash
let sessionStore = null;
if (!process.env.VERCEL && process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1') {
  try {
    sessionStore = new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000,
      createDatabaseTable: true
    }, pool);
    sessionStore.on('error', (err) => console.warn('Session store error:', err.message));
  } catch (e) {
    console.warn('MySQL session store fallback:', e.message);
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const sessionConfig = {
  key: 'duesguard_session_id',
  secret: process.env.SESSION_SECRET || 'duesguard_super_secure_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax'
  }
};
if (sessionStore) sessionConfig.store = sessionStore;
app.use(session(sessionConfig));

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' }
});

// Serve Static Frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use('/invoices/download', express.static(pdfDir));

// Auth Middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

// Ownership Middleware: Verifies business belongs to the authenticated user
async function requireBusinessOwner(req, res, next) {
  const businessId = req.headers['x-business-id'] || req.body.business_id || req.query.business_id;
  if (!businessId) {
    return res.status(400).json({ error: 'Business ID is required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, user_id, user_email, business_name, state, gstin, invoice_prefix, default_payment_terms_days FROM businesses WHERE id = ?',
      [businessId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const business = rows[0];
    const isOwner = (business.user_id && business.user_id === req.session.userId) ||
                    (business.user_email && business.user_email.toLowerCase() === req.session.userEmail.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: You do not own this business.' });
    }

    req.currentBusiness = business;
    next();
  } catch (err) {
    console.error('Business authorization check error:', err);
    res.status(500).json({ error: 'Database error occurred during authorization check.' });
  }
}

// ==========================================
// 1. AUTHENTICATION & SESSION ROUTES
// ==========================================

// Check session status on browser refresh
app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail
      }
    });
  }
  res.json({ authenticated: false });
});

// Signup Route
app.post('/api/signup', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, hashedPassword]
    );

    // Auto-login upon registration
    req.session.regenerate((err) => {
      if (err) console.error('Session regeneration error:', err);
      req.session.userId = result.insertId;
      req.session.userName = name.trim();
      req.session.userEmail = normalizedEmail;

      res.status(201).json({
        message: 'Account created successfully!',
        user: { id: result.insertId, name: name.trim(), email: normalizedEmail }
      });
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Login Route
app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Regenerate session for session fixation protection
    req.session.regenerate((err) => {
      if (err) console.error('Session regeneration error:', err);
      req.session.userId = user.id;
      req.session.userName = user.name;
      req.session.userEmail = user.email;

      res.json({
        message: 'Login successful!',
        user: { id: user.id, name: user.name, email: user.email }
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Logout Route
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('duesguard_session_id');
    res.json({ message: 'Logged out successfully.' });
  });
});

// Request Password Reset Token (Time-limited & single use)
app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      // Do not disclose user existence for privacy
      return res.json({ message: 'If an account exists with that email, a reset token has been issued.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await pool.query(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE email = ?',
      [resetTokenHash, expiresAt, normalizedEmail]
    );

    // In a full production setup this sends via email; for safe local MSME use we also return token if in development
    res.json({
      message: 'Password reset token generated. Valid for 30 minutes.',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Reset Password with Token
app.post('/api/reset-password', authLimiter, async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const user = rows[0];

    // Check token if supplied or if user has active reset token
    if (user.reset_token_hash) {
      if (!token) return res.status(400).json({ error: 'Reset token is required.' });
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      if (hash !== user.reset_token_hash || new Date() > new Date(user.reset_token_expires_at)) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE email = ?',
      [hashedPassword, normalizedEmail]
    );

    res.json({ message: 'Password updated successfully! Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 2. BUSINESS MANAGEMENT ROUTES
// ==========================================

// Register Business
app.post('/api/businesses', requireAuth, async (req, res) => {
  const { business_name, business_type, phone, address, state, gstin, pincode, invoice_prefix, default_payment_terms_days } = req.body;
  if (!business_name) {
    return res.status(400).json({ error: 'Business name is required.' });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO businesses 
      (user_id, user_email, business_name, business_type, phone, address, state, gstin, pincode, invoice_prefix, default_payment_terms_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.session.userId,
      req.session.userEmail,
      business_name.trim(),
      business_type || 'General',
      phone || '',
      address || '',
      state || 'Karnataka',
      gstin || null,
      pincode || null,
      invoice_prefix || 'INV',
      Number(default_payment_terms_days) || 30
    ]);

    res.status(201).json({
      message: 'Business registered successfully!',
      business: {
        id: result.insertId,
        business_name: business_name.trim(),
        business_type: business_type || 'General',
        state: state || 'Karnataka',
        gstin: gstin || ''
      }
    });
  } catch (err) {
    console.error('Register business error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Get User's Businesses
app.get('/api/businesses', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, business_name, business_type, phone, address, state, gstin, pincode, invoice_prefix, default_payment_terms_days, created_at FROM businesses WHERE user_id = ? OR LOWER(user_email) = ? ORDER BY id DESC',
      [req.session.userId, req.session.userEmail.toLowerCase()]
    );
    res.json({ businesses: rows });
  } catch (err) {
    console.error('Fetch businesses error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Update Business
app.put('/api/businesses/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { business_name, business_type, phone, address, state, gstin, pincode, invoice_prefix, default_payment_terms_days } = req.body;

  try {
    const [biz] = await pool.query('SELECT * FROM businesses WHERE id = ?', [id]);
    if (biz.length === 0) return res.status(404).json({ error: 'Business not found.' });

    const b = biz[0];
    if (b.user_id !== req.session.userId && b.user_email.toLowerCase() !== req.session.userEmail.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    await pool.query(`
      UPDATE businesses 
      SET business_name = ?, business_type = ?, phone = ?, address = ?, state = ?, gstin = ?, pincode = ?, invoice_prefix = ?, default_payment_terms_days = ?
      WHERE id = ?
    `, [
      business_name || b.business_name,
      business_type || b.business_type,
      phone !== undefined ? phone : b.phone,
      address !== undefined ? address : b.address,
      state || b.state,
      gstin !== undefined ? gstin : b.gstin,
      pincode !== undefined ? pincode : b.pincode,
      invoice_prefix || b.invoice_prefix,
      Number(default_payment_terms_days) || b.default_payment_terms_days,
      id
    ]);

    res.json({ message: 'Business profile updated successfully!' });
  } catch (err) {
    console.error('Update business error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 3. PRODUCT CATALOGUE ROUTES
// ==========================================

// Get Products
app.get('/api/products', requireAuth, requireBusinessOwner, async (req, res) => {
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  try {
    let query = 'SELECT id, business_id, name, sku, description, unit, cost_price, selling_price, gst_rate, is_active, created_at FROM products WHERE business_id = ?';
    const params = [req.currentBusiness.id];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(search, search);
    }
    query += ' ORDER BY id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ products: rows });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Create Product
app.post('/api/products', requireAuth, requireBusinessOwner, async (req, res) => {
  const { name, sku, description, unit, cost_price, selling_price, gst_rate } = req.body;
  if (!name || selling_price === undefined) {
    return res.status(400).json({ error: 'Product name and selling price are required.' });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO products (business_id, name, sku, description, unit, cost_price, selling_price, gst_rate, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      req.currentBusiness.id,
      name.trim(),
      sku ? sku.trim() : null,
      description || null,
      unit || 'PCS',
      Number(cost_price) || 0.00,
      Number(selling_price) || 0.00,
      Number(gst_rate) !== undefined ? Number(gst_rate) : 18.00
    ]);

    res.status(201).json({ message: 'Product added successfully!', productId: result.insertId });
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Update Product
app.put('/api/products/:id', requireAuth, requireBusinessOwner, async (req, res) => {
  const { id } = req.params;
  const { name, sku, description, unit, cost_price, selling_price, gst_rate, is_active } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ? AND business_id = ?', [id, req.currentBusiness.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Product not found.' });

    await pool.query(`
      UPDATE products 
      SET name = ?, sku = ?, description = ?, unit = ?, cost_price = ?, selling_price = ?, gst_rate = ?, is_active = ?
      WHERE id = ? AND business_id = ?
    `, [
      name.trim(),
      sku ? sku.trim() : null,
      description || null,
      unit || 'PCS',
      Number(cost_price) || 0,
      Number(selling_price) || 0,
      Number(gst_rate) || 18,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id,
      req.currentBusiness.id
    ]);

    res.json({ message: 'Product updated successfully!' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Deactivate / Delete Product
app.delete('/api/products/:id', requireAuth, requireBusinessOwner, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE products SET is_active = 0 WHERE id = ? AND business_id = ?', [id, req.currentBusiness.id]);
    res.json({ message: 'Product deactivated successfully.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 4. CUSTOMER MANAGEMENT ROUTES
// ==========================================

// Get Customers
app.get('/api/customers', requireAuth, requireBusinessOwner, async (req, res) => {
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  try {
    let query = 'SELECT * FROM customers WHERE business_id = ?';
    const params = [req.currentBusiness.id];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR gstin LIKE ?)';
      params.push(search, search, search);
    }
    query += ' ORDER BY id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ customers: rows });
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Create Customer
app.post('/api/customers', requireAuth, requireBusinessOwner, async (req, res) => {
  const { name, email, phone, billing_address, shipping_address, gstin, state, notes } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Customer name and email are required.' });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO customers (business_id, name, email, phone, billing_address, shipping_address, gstin, state, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.currentBusiness.id,
      name.trim(),
      email.trim(),
      phone || null,
      billing_address || null,
      shipping_address || null,
      gstin ? gstin.trim().toUpperCase() : null,
      state || 'Karnataka',
      notes || null
    ]);

    res.status(201).json({ message: 'Customer created successfully!', customerId: result.insertId });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Update Customer
app.put('/api/customers/:id', requireAuth, requireBusinessOwner, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, billing_address, shipping_address, gstin, state, notes } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM customers WHERE id = ? AND business_id = ?', [id, req.currentBusiness.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Customer not found.' });

    await pool.query(`
      UPDATE customers 
      SET name = ?, email = ?, phone = ?, billing_address = ?, shipping_address = ?, gstin = ?, state = ?, notes = ?
      WHERE id = ? AND business_id = ?
    `, [
      name.trim(),
      email.trim(),
      phone || null,
      billing_address || null,
      shipping_address || null,
      gstin ? gstin.trim().toUpperCase() : null,
      state || 'Karnataka',
      notes || null,
      id,
      req.currentBusiness.id
    ]);

    res.json({ message: 'Customer updated successfully!' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 5. INVOICE GENERATION & CALCULATION ENGINE
// ==========================================

// List Invoices
app.get('/api/invoices', requireAuth, requireBusinessOwner, async (req, res) => {
  const { status, search } = req.query;
  try {
    let query = `
      SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.business_id = ?
    `;
    const params = [req.currentBusiness.id];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY i.id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ invoices: rows });
  } catch (err) {
    console.error('Fetch invoices error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Get Single Invoice with Items and Payments
app.get('/api/invoices/:id', requireAuth, requireBusinessOwner, async (req, res) => {
  const { id } = req.params;
  try {
    const [invRows] = await pool.query(`
      SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.billing_address, c.gstin AS customer_gstin, c.state AS customer_state
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ? AND i.business_id = ?
    `, [id, req.currentBusiness.id]);

    if (invRows.length === 0) return res.status(404).json({ error: 'Invoice not found.' });

    const invoice = invRows[0];
    const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    const [payments] = await pool.query('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC', [id]);

    res.json({ invoice, items, payments });
  } catch (err) {
    console.error('Fetch invoice details error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// Create Invoice (Authoritative Backend Financial Calculation)
app.post('/api/invoices', requireAuth, requireBusinessOwner, async (req, res) => {
  const { customer_id, invoice_date, due_date, discount, po_reference, notes, items } = req.body;

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer and at least one item are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify Customer
    const [custRows] = await connection.query('SELECT * FROM customers WHERE id = ? AND business_id = ?', [customer_id, req.currentBusiness.id]);
    if (custRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const customer = custRows[0];

    // Determine Place of Supply (Intra-state vs Inter-state IGST)
    const sellerState = (req.currentBusiness.state || '').trim().toLowerCase();
    const buyerState = (customer.state || '').trim().toLowerCase();
    const isInterState = sellerState && buyerState && sellerState !== buyerState;
    const placeOfSupply = isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)';

    // 2. Concurrency-Safe Invoice Number Generation
    const prefix = req.currentBusiness.invoice_prefix || 'INV';
    const [countRows] = await connection.query('SELECT COUNT(*) as cnt FROM invoices WHERE business_id = ? FOR UPDATE', [req.currentBusiness.id]);
    const nextNum = (countRows[0].cnt + 1).toString().padStart(4, '0');
    const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${nextNum}`;

    // 3. Recalculate all amounts authoritatively on backend
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const validatedItems = [];
    for (const item of items) {
      const qty = Math.max(0.01, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);
      const gstRate = Math.max(0, Number(item.gst_rate) || 0);
      const lineSubtotal = qty * unitPrice;

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isInterState) {
        lineIgst = (lineSubtotal * gstRate) / 100;
      } else {
        lineCgst = (lineSubtotal * (gstRate / 2)) / 100;
        lineSgst = (lineSubtotal * (gstRate / 2)) / 100;
      }

      const lineTotal = lineSubtotal + lineCgst + lineSgst + lineIgst;

      subtotal += lineSubtotal;
      totalCgst += lineCgst;
      totalSgst += lineSgst;
      totalIgst += lineIgst;

      validatedItems.push({
        product_id: item.product_id || null,
        product_name: item.product_name || 'Service / Product Item',
        sku: item.sku || null,
        unit: item.unit || 'PCS',
        quantity: qty,
        unit_price: unitPrice,
        gst_rate: gstRate,
        cgst_amount: lineCgst,
        sgst_amount: lineSgst,
        igst_amount: lineIgst,
        total_amount: lineTotal
      });
    }

    const totalDiscount = Math.max(0, Number(discount) || 0);
    const grandTotal = Math.max(0, (subtotal + totalCgst + totalSgst + totalIgst) - totalDiscount);
    const balanceDue = grandTotal;

    const invDate = invoice_date || new Date().toISOString().split('T')[0];
    const defaultDueDays = req.currentBusiness.default_payment_terms_days || 30;
    const computedDueDate = due_date || new Date(Date.now() + defaultDueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 4. Insert Invoice Header
    const [invResult] = await connection.query(`
      INSERT INTO invoices 
      (business_id, customer_id, invoice_number, invoice_date, due_date, status, place_of_supply, subtotal, total_cgst, total_sgst, total_igst, total_discount, grand_total, amount_paid, balance_due, notes, po_reference)
      VALUES (?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?)
    `, [
      req.currentBusiness.id,
      customer_id,
      invoiceNumber,
      invDate,
      computedDueDate,
      placeOfSupply,
      subtotal.toFixed(2),
      totalCgst.toFixed(2),
      totalSgst.toFixed(2),
      totalIgst.toFixed(2),
      totalDiscount.toFixed(2),
      grandTotal.toFixed(2),
      balanceDue.toFixed(2),
      notes || null,
      po_reference || null
    ]);

    const invoiceId = invResult.insertId;

    // 5. Insert Invoice Item Snapshots
    for (const it of validatedItems) {
      await connection.query(`
        INSERT INTO invoice_items 
        (invoice_id, product_id, product_name, sku, unit, quantity, unit_price, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        it.product_id,
        it.product_name,
        it.sku,
        it.unit,
        it.quantity,
        it.unit_price,
        it.gst_rate,
        it.cgst_amount.toFixed(2),
        it.sgst_amount.toFixed(2),
        it.igst_amount.toFixed(2),
        it.total_amount.toFixed(2)
      ]);
    }

    // 6. Generate PDF Artifact
    const pdfFilename = `Invoice-${invoiceNumber}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    const invoiceForPdf = {
      invoice_number: invoiceNumber,
      invoice_date: invDate,
      due_date: computedDueDate,
      place_of_supply: placeOfSupply,
      subtotal,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
      total_igst: totalIgst,
      total_discount: totalDiscount,
      grand_total: grandTotal,
      amount_paid: 0,
      balance_due: balanceDue,
      po_reference
    };

    await generateInvoicePdf(invoiceForPdf, req.currentBusiness, customer, validatedItems, pdfPath);
    await connection.query('UPDATE invoices SET pdf_path = ? WHERE id = ?', [`/invoices/download/${pdfFilename}`, invoiceId]);

    await connection.commit();

    res.status(201).json({
      message: 'Invoice created successfully!',
      invoiceId,
      invoiceNumber,
      grandTotal: grandTotal.toFixed(2),
      pdfUrl: `/invoices/download/${pdfFilename}`
    });
  } catch (err) {
    await connection.rollback();
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: 'Failed to create invoice: ' + err.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// 6. UPLOAD & EXTRACT INVOICE (DIGITAL & OCR)
// ==========================================

app.post('/api/invoices/upload', requireAuth, requireBusinessOwner, upload.single('invoice_file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF or image invoice file.' });
  }

  try {
    const filePath = req.file.path;
    let extractedData = {};

    if (req.file.mimetype === 'application/pdf') {
      extractedData = await extractInvoiceFromPdf(filePath);
    } else {
      extractedData = {
        invoice_number: `OCR-${Date.now().toString().slice(-5)}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        grand_total: 0.00,
        confidence: { note: 'Scanned image: Review and input financial figures' }
      };
    }

    // Save document record
    const [docResult] = await pool.query(`
      INSERT INTO documents 
      (business_id, original_filename, stored_filename, file_path, file_size, mime_type, document_type, extracted_data)
      VALUES (?, ?, ?, ?, ?, ?, 'invoice', ?)
    `, [
      req.currentBusiness.id,
      req.file.originalname,
      req.file.filename,
      filePath,
      req.file.size,
      req.file.mimetype,
      JSON.stringify(extractedData)
    ]);

    // Check potential duplicates
    let duplicateWarning = false;
    if (extractedData.invoice_number) {
      const [dups] = await pool.query('SELECT id, invoice_number FROM invoices WHERE business_id = ? AND invoice_number = ?', [req.currentBusiness.id, extractedData.invoice_number]);
      if (dups.length > 0) duplicateWarning = true;
    }

    res.json({
      message: 'File processed and extracted successfully.',
      documentId: docResult.insertId,
      filename: req.file.originalname,
      extractedData,
      duplicateWarning
    });
  } catch (err) {
    console.error('Upload & extract error:', err);
    res.status(500).json({ error: 'Failed to extract invoice data: ' + err.message });
  }
});

// ==========================================
// 7. PAYMENT TRACKING ROUTES
// ==========================================

app.post('/api/payments', requireAuth, requireBusinessOwner, async (req, res) => {
  const { invoice_id, amount, payment_date, payment_method, reference_no, notes } = req.body;

  if (!invoice_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid invoice ID and positive payment amount are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [invRows] = await connection.query('SELECT * FROM invoices WHERE id = ? AND business_id = ? FOR UPDATE', [invoice_id, req.currentBusiness.id]);
    if (invRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = invRows[0];
    const payAmount = Number(amount);

    if (payAmount > Number(invoice.balance_due) + 0.01) {
      await connection.rollback();
      return res.status(400).json({ error: `Payment amount (${payAmount}) exceeds outstanding balance (${invoice.balance_due}).` });
    }

    // Insert payment
    await connection.query(`
      INSERT INTO payments (invoice_id, business_id, payment_date, amount, payment_method, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_id,
      req.currentBusiness.id,
      payment_date || new Date().toISOString().split('T')[0],
      payAmount,
      payment_method || 'Bank Transfer',
      reference_no || null,
      notes || null
    ]);

    // Recalculate amounts
    const newAmountPaid = Number(invoice.amount_paid) + payAmount;
    const newBalanceDue = Math.max(0, Number(invoice.grand_total) - newAmountPaid);
    
    let newStatus = invoice.status;
    if (newBalanceDue < 0.01) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    await connection.query(`
      UPDATE invoices 
      SET amount_paid = ?, balance_due = ?, status = ?
      WHERE id = ?
    `, [newAmountPaid.toFixed(2), newBalanceDue.toFixed(2), newStatus, invoice_id]);

    await connection.commit();

    res.status(201).json({
      message: 'Payment recorded successfully!',
      amountPaid: newAmountPaid.toFixed(2),
      balanceDue: newBalanceDue.toFixed(2),
      status: newStatus
    });
  } catch (err) {
    await connection.rollback();
    console.error('Payment record error:', err);
    res.status(500).json({ error: 'Database error occurred: ' + err.message });
  } finally {
    connection.release();
  }
});

// Get Payments for Business
app.get('/api/payments', requireAuth, requireBusinessOwner, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, i.invoice_number, c.name AS customer_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      WHERE p.business_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
    `, [req.currentBusiness.id]);
    res.json({ payments: rows });
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 8. EMAIL REMINDERS & BACKGROUND SCHEDULING
// ==========================================

// Trigger reminder check cycle manually or preview
app.post('/api/reminders/trigger', requireAuth, requireBusinessOwner, async (req, res) => {
  try {
    const result = await processOverdueReminders();
    res.json({ message: 'Overdue reminder check cycle executed successfully.', result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run reminder cycle: ' + err.message });
  }
});

// Send single test reminder
app.post('/api/reminders/test-send', requireAuth, requireBusinessOwner, async (req, res) => {
  const { invoice_id, test_email } = req.body;
  if (!invoice_id || !test_email) {
    return res.status(400).json({ error: 'Invoice ID and test recipient email are required.' });
  }

  try {
    const [invoices] = await pool.query(`
      SELECT i.*, b.business_name, c.id as cust_id, c.name as customer_name 
      FROM invoices i
      JOIN businesses b ON i.business_id = b.id
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ? AND i.business_id = ?
    `, [invoice_id, req.currentBusiness.id]);

    if (invoices.length === 0) return res.status(404).json({ error: 'Invoice not found.' });

    const inv = invoices[0];
    const emailResult = await sendInvoiceReminder({
      businessId: req.currentBusiness.id,
      invoiceId: inv.id,
      customerId: inv.cust_id,
      recipientEmail: test_email,
      subject: `[TEST REMINDER] Invoice ${inv.invoice_number} from ${inv.business_name}`,
      reminderType: 'manual_test_send',
      emailData: {
        businessName: inv.business_name,
        customerName: inv.customer_name,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        grandTotal: inv.grand_total,
        amountPaid: inv.amount_paid,
        balanceDue: inv.balance_due,
        daysOverdue: Math.max(0, Math.floor((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24)))
      }
    });

    res.json({ message: 'Test reminder dispatched!', details: emailResult });
  } catch (err) {
    console.error('Test reminder error:', err);
    res.status(500).json({ error: 'Failed to send test email: ' + err.message });
  }
});

// View reminder logs
app.get('/api/reminders/logs', requireAuth, requireBusinessOwner, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, i.invoice_number, c.name as customer_name
      FROM email_reminder_logs r
      JOIN invoices i ON r.invoice_id = i.id
      JOIN customers c ON r.customer_id = c.id
      WHERE r.business_id = ?
      ORDER BY r.id DESC
      LIMIT 100
    `, [req.currentBusiness.id]);

    res.json({ logs: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reminder logs.' });
  }
});

// ==========================================
// 9. DASHBOARD & AGING ANALYTICS
// ==========================================

app.get('/api/dashboard/metrics', requireAuth, requireBusinessOwner, async (req, res) => {
  const bizId = req.currentBusiness.id;
  try {
    // 1. Receivables Summary
    const [summaryRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(balance_due), 0) AS total_receivables,
        COALESCE(SUM(CASE WHEN due_date < CURDATE() AND balance_due > 0.01 THEN balance_due ELSE 0 END), 0) AS total_overdue,
        COUNT(CASE WHEN balance_due > 0.01 THEN 1 END) AS outstanding_invoices_count,
        COUNT(CASE WHEN due_date < CURDATE() AND balance_due > 0.01 THEN 1 END) AS overdue_invoices_count,
        COUNT(CASE WHEN status = 'partially_paid' THEN 1 END) AS partially_paid_count,
        COALESCE(SUM(amount_paid), 0) AS total_collected
      FROM invoices 
      WHERE business_id = ? AND status != 'cancelled'
    `, [bizId]);

    // 2. Aging Buckets
    const [agingRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN balance_due ELSE 0 END), 0) AS bucket_current,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 7 THEN balance_due ELSE 0 END), 0) AS bucket_1_7,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 8 AND 15 THEN balance_due ELSE 0 END), 0) AS bucket_8_15,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 16 AND 30 THEN balance_due ELSE 0 END), 0) AS bucket_16_30,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 30 THEN balance_due ELSE 0 END), 0) AS bucket_over_30
      FROM invoices
      WHERE business_id = ? AND balance_due > 0.01 AND status != 'cancelled'
    `, [bizId]);

    // 3. Recent Invoices
    const [recentInvoices] = await pool.query(`
      SELECT i.*, c.name as customer_name 
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.business_id = ? 
      ORDER BY i.id DESC LIMIT 5
    `, [bizId]);

    // 4. Recent Reminders
    const [recentReminders] = await pool.query(`
      SELECT r.*, i.invoice_number, c.name as customer_name
      FROM email_reminder_logs r
      JOIN invoices i ON r.invoice_id = i.id
      JOIN customers c ON r.customer_id = c.id
      WHERE r.business_id = ?
      ORDER BY r.id DESC LIMIT 5
    `, [bizId]);

    res.json({
      summary: summaryRows[0],
      aging: agingRows[0],
      recentInvoices,
      recentReminders
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 10. AGENTIC AI DISPUTE & MSME SAMADHAAN
// ==========================================

app.post('/api/ai/dispute-prep', requireAuth, requireBusinessOwner, async (req, res) => {
  const { invoice_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'Invoice ID is required.' });

  try {
    const analysis = await runDisputePreparationWorkflow(req.currentBusiness.id, invoice_id);
    res.json(analysis);
  } catch (err) {
    console.error('AI dispute preparation error:', err);
    res.status(500).json({ error: 'Failed to prepare dispute case: ' + err.message });
  }
});

app.get('/api/ai/cases', requireAuth, requireBusinessOwner, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dc.*, i.invoice_number, i.balance_due, c.name as customer_name
      FROM dispute_cases dc
      JOIN invoices i ON dc.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      WHERE dc.business_id = ?
      ORDER BY dc.id DESC
    `, [req.currentBusiness.id]);
    res.json({ cases: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error.' });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================

let migrationsRan = false;
async function startServer() {
  try {
    if (!migrationsRan) {
      await runMigrations().catch(e => console.warn('Migration run warning:', e.message));
      migrationsRan = true;
    }
    // Only run persistent scheduler in non-serverless environment
    if (!process.env.VERCEL) {
      startScheduler();
    }

    if (!process.env.VERCEL) {
      app.listen(port, () => {
        console.log(`DuesGuard AI full-stack platform running on http://localhost:${port}`);
      });
    }
  } catch (err) {
    console.error('Server startup error:', err);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
