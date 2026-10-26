const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Auto-initialize DB table if DB is accessible
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(191) NOT NULL,
        business_name VARCHAR(150) NOT NULL,
        business_type VARCHAR(100) DEFAULT 'General',
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_business_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('MySQL connected, users and businesses tables verified.');
  } catch (err) {
    console.warn('MySQL connection warning (ensure MySQL is running & configured in .env):', err.message);
  }
}
initDb();

// Signup Route
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    return res.status(201).json({
      message: 'Account created successfully!',
      userId: result.insertId,
      user: { name, email: email.toLowerCase() }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Database error occurred: ' + err.message });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({
      message: 'Login successful!',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error occurred: ' + err.message });
  }
});

// Reset Password Route
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email.trim().toLowerCase()]);

    return res.json({ message: 'Password updated successfully! Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Database error occurred: ' + err.message });
  }
});

// Register Business Route
app.post('/api/businesses', async (req, res) => {
  const { user_email, business_name, business_type, phone, address } = req.body;
  if (!user_email || !business_name) {
    return res.status(400).json({ error: 'User email and business name are required.' });
  }

  try {
    // Verify user exists first (for foreign key integrity)
    const [userRows] = await pool.query('SELECT email FROM users WHERE email = ?', [user_email.trim().toLowerCase()]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User does not exist.' });
    }

    const [result] = await pool.query(
      'INSERT INTO businesses (user_email, business_name, business_type, phone, address) VALUES (?, ?, ?, ?, ?)',
      [user_email.trim().toLowerCase(), business_name.trim(), business_type || 'General', phone || '', address || '']
    );

    return res.status(201).json({
      message: 'Business registered successfully!',
      business: {
        id: result.insertId,
        user_email: user_email.trim().toLowerCase(),
        business_name: business_name.trim(),
        business_type: business_type || 'General',
        phone: phone || '',
        address: address || ''
      }
    });
  } catch (err) {
    console.error('Business register error:', err);
    return res.status(500).json({ error: 'Database error occurred: ' + err.message });
  }
});

// Get User's Businesses Route
app.get('/api/businesses', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, business_name, business_type, phone, address, created_at FROM businesses WHERE user_email = ? ORDER BY id DESC',
      [email.trim().toLowerCase()]
    );
    return res.json({ businesses: rows });
  } catch (err) {
    console.error('Fetch businesses error:', err);
    return res.status(500).json({ error: 'Database error occurred: ' + err.message });
  }
});

app.listen(port, () => {
  console.log(`DuesGuard auth server running on http://localhost:${port}`);
});
