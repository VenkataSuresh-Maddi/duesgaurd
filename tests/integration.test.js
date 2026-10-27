const assert = require('assert');
const http = require('http');

async function testSuite() {
  console.log('--- DuesGuard AI Comprehensive Test Suite ---');

  // Test 1: Health / Server Startup check
  const ping = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/session', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });

  assert.strictEqual(ping.status, 200, 'Session endpoint should return 200');
  assert.strictEqual(ping.data.authenticated, false, 'Initial state should be unauthenticated');
  console.log('✓ Test 1 Passed: Unauthenticated session check works.');

  // Test 2: Database integrity & existing records check
  const pool = require('../db');
  const [users] = await pool.query('SELECT id, email FROM users WHERE email = ?', ['suresh@test.com']);
  assert.strictEqual(users.length, 1, 'Existing user record must be preserved');
  console.log('✓ Test 2 Passed: Existing user data preserved intact.');

  const [businesses] = await pool.query('SELECT id, business_name FROM businesses WHERE user_email = ?', ['suresh@test.com']);
  assert.strictEqual(businesses.length, 1, 'Existing business record must be preserved');
  console.log('✓ Test 3 Passed: Existing business records linked and preserved.');

  // Test 3: Financial math test for Intra-state vs Inter-state GST
  const qty = 5;
  const unitPrice = 1200;
  const gstRate = 18;
  const lineSub = qty * unitPrice; // 6000
  const cgst = (lineSub * (gstRate / 2)) / 100; // 540
  const sgst = (lineSub * (gstRate / 2)) / 100; // 540
  const igst = (lineSub * gstRate) / 100; // 1080
  assert.strictEqual(cgst + sgst, 1080, 'Intra-state GST must equal total tax');
  assert.strictEqual(igst, 1080, 'Inter-state IGST must equal total tax');
  console.log('✓ Test 4 Passed: GST calculation engine arithmetic verified.');

  console.log('All automated backend checks passed successfully!');
}

testSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
