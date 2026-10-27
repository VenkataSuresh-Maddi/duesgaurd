// DuesGuard AI — Client Engine
let currentUser = null;
let currentBusinessId = null;
let cachedBusinesses = [];
let cachedCustomers = [];
let cachedProducts = [];

// DOM References
const authView = document.getElementById('authView');
const appShell = document.getElementById('appShell');
const authAlert = document.getElementById('authAlert');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const resetForm = document.getElementById('resetForm');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabSignupBtn = document.getElementById('tabSignupBtn');
const authTabs = document.getElementById('authTabs');
const authSubtitle = document.getElementById('authSubtitle');
const forgotPwLink = document.getElementById('forgotPwLink');
const backToLoginLink = document.getElementById('backToLoginLink');

// Navigation
const businessSelect = document.getElementById('businessSelect');
const navItems = document.querySelectorAll('.nav-item');
const contentTabs = document.querySelectorAll('.content-tab');

function showAlert(box, msg, type = 'error') {
  if (!box) return;
  box.textContent = msg;
  box.className = `alert-box ${type}`;
}

function clearAlert(box) {
  if (!box) return;
  box.textContent = '';
  box.className = 'alert-box';
}

// ================= AUTHENTICATION & SESSION RESTORATION =================
async function checkActiveSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.authenticated && data.user) {
      currentUser = data.user;
      showAppShell();
    } else {
      showAuthView();
    }
  } catch (err) {
    showAuthView();
  }
}

function showAuthView() {
  authView.style.display = 'flex';
  appShell.style.display = 'none';
}

function showAppShell() {
  authView.style.display = 'none';
  appShell.style.display = 'flex';
  document.getElementById('sidebarUserName').textContent = currentUser.name;
  document.getElementById('sidebarUserEmail').textContent = currentUser.email;
  document.getElementById('avatarInitial').textContent = currentUser.name.charAt(0).toUpperCase();

  loadBusinesses();
}

// Switch Auth Tabs
tabLoginBtn.addEventListener('click', () => {
  clearAlert(authAlert);
  tabLoginBtn.classList.add('active');
  tabSignupBtn.classList.remove('active');
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  resetForm.style.display = 'none';
  authTabs.style.display = 'flex';
  authSubtitle.textContent = 'MSME Payment Intelligence & Dispute Resolution';
});

tabSignupBtn.addEventListener('click', () => {
  clearAlert(authAlert);
  tabSignupBtn.classList.add('active');
  tabLoginBtn.classList.remove('active');
  signupForm.style.display = 'block';
  loginForm.style.display = 'none';
  resetForm.style.display = 'none';
  authTabs.style.display = 'flex';
  authSubtitle.textContent = 'Create your account to secure MSME receivables';
});

forgotPwLink.addEventListener('click', (e) => {
  e.preventDefault();
  clearAlert(authAlert);
  authTabs.style.display = 'none';
  loginForm.style.display = 'none';
  signupForm.style.display = 'none';
  resetForm.style.display = 'block';
  authSubtitle.textContent = 'Reset your account password with time-limited token';
});

backToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  tabLoginBtn.click();
});

// Submit Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(authAlert);
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(authAlert, data.error || 'Login failed.');

    currentUser = data.user;
    showAppShell();
  } catch (err) {
    showAlert(authAlert, 'Network error: ' + err.message);
  }
});

// Submit Signup
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(authAlert);
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(authAlert, data.error || 'Signup failed.');

    currentUser = data.user;
    showAppShell();
  } catch (err) {
    showAlert(authAlert, 'Network error: ' + err.message);
  }
});

// Submit Password Reset
resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(authAlert);
  const email = document.getElementById('resetEmail').value.trim();
  const token = document.getElementById('resetToken').value.trim();
  const newPassword = document.getElementById('resetNewPassword').value;

  try {
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(authAlert, data.error || 'Reset failed.');

    showAlert(authAlert, data.message, 'success');
    setTimeout(() => tabLoginBtn.click(), 1500);
  } catch (err) {
    showAlert(authAlert, 'Network error: ' + err.message);
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (e) {}
  currentUser = null;
  currentBusinessId = null;
  showAuthView();
});

// ================= BUSINESS MANAGEMENT =================
async function loadBusinesses() {
  try {
    const res = await fetch('/api/businesses');
    const data = await res.json();
    cachedBusinesses = data.businesses || [];

    businessSelect.innerHTML = '';
    const allBizList = document.getElementById('allBusinessesList');
    allBizList.innerHTML = '';

    if (cachedBusinesses.length === 0) {
      businessSelect.innerHTML = '<option value="">No businesses registered</option>';
      allBizList.innerHTML = '<p style="color:#94a3b8;">No businesses registered yet. Create your first enterprise on the left.</p>';
      switchTab('businesses');
      return;
    }

    cachedBusinesses.forEach((b, idx) => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.business_name} (${b.business_type || 'General'})`;
      businessSelect.appendChild(opt);

      // Business list item
      const item = document.createElement('div');
      item.style.cssText = 'background:#090d16; border:1px solid #1e293b; border-radius:6px; padding:1rem; margin-bottom:0.75rem;';
      item.innerHTML = `
        <div style="font-weight:700; color:#fff;">${escapeHtml(b.business_name)}</div>
        <div style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">
          Type: ${escapeHtml(b.business_type || 'General')} | State: ${escapeHtml(b.state || 'Karnataka')}
        </div>
        <div style="font-size:0.8rem; color:#64748b; margin-top:0.25rem;">
          ${b.gstin ? 'GSTIN: ' + escapeHtml(b.gstin) + ' • ' : ''} Phone: ${escapeHtml(b.phone || 'N/A')}
        </div>
      `;
      allBizList.appendChild(item);
    });

    if (!currentBusinessId || !cachedBusinesses.some(b => b.id === Number(currentBusinessId))) {
      currentBusinessId = cachedBusinesses[0].id;
    }
    businessSelect.value = currentBusinessId;

    loadActiveBusinessData();
  } catch (err) {
    console.error('Failed to load businesses:', err);
  }
}

businessSelect.addEventListener('change', () => {
  currentBusinessId = businessSelect.value;
  loadActiveBusinessData();
});

document.getElementById('quickAddBizBtn').addEventListener('click', () => switchTab('businesses'));

// Register New Business Form
document.getElementById('newBizForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const business_name = document.getElementById('regBizName').value.trim();
  const business_type = document.getElementById('regBizType').value.trim();
  const gstin = document.getElementById('regBizGSTIN').value.trim();
  const state = document.getElementById('regBizState').value.trim();
  const phone = document.getElementById('regBizPhone').value.trim();
  const address = document.getElementById('regBizAddress').value.trim();

  try {
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name, business_type, gstin, state, phone, address })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to register business.');

    document.getElementById('newBizForm').reset();
    await loadBusinesses();
    switchTab('dashboard');
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});

// Tab Switching
navItems.forEach(item => {
  item.addEventListener('click', () => {
    switchTab(item.getAttribute('data-tab'));
  });
});

function switchTab(tabId) {
  navItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-tab') === tabId));
  contentTabs.forEach(tab => {
    tab.style.display = tab.id === `tab-${tabId}` ? 'block' : 'none';
  });

  if (tabId === 'dashboard') loadDashboardMetrics();
  else if (tabId === 'invoices') loadInvoices();
  else if (tabId === 'customers') loadCustomers();
  else if (tabId === 'products') loadProducts();
  else if (tabId === 'payments') loadPayments();
  else if (tabId === 'reminders') loadReminderLogs();
  else if (tabId === 'disputes') loadDisputeCases();
}

function loadActiveBusinessData() {
  loadDashboardMetrics();
  loadCustomers();
  loadProducts();
  loadInvoices();
}

// Helper headers with active business context
function getBizHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-business-id': currentBusinessId
  };
}

// ================= DASHBOARD METRICS & AGING =================
async function loadDashboardMetrics() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/dashboard/metrics', { headers: getBizHeaders() });
    const data = await res.json();
    if (!res.ok) return;

    const sum = data.summary || {};
    const aging = data.aging || {};

    document.getElementById('metricTotalReceivables').textContent = `₹ ${Number(sum.total_receivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('metricTotalOverdue').textContent = `₹ ${Number(sum.total_overdue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('metricTotalCollected').textContent = `₹ ${Number(sum.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('metricOverdueCount').textContent = sum.overdue_invoices_count || 0;

    // Aging Buckets
    document.getElementById('agingCurrent').textContent = `₹ ${Number(aging.bucket_current || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('aging1_7').textContent = `₹ ${Number(aging.bucket_1_7 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('aging8_15').textContent = `₹ ${Number(aging.bucket_8_15 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('aging16_30').textContent = `₹ ${Number(aging.bucket_16_30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('agingOver30').textContent = `₹ ${Number(aging.bucket_over_30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Dashboard Recent Invoices
    const tbody = document.getElementById('dashboardInvoicesBody');
    if (!data.recentInvoices || data.recentInvoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No invoices found.</td></tr>';
    } else {
      tbody.innerHTML = data.recentInvoices.map(inv => `
        <tr>
          <td style="font-weight:600; color:#fff;">${escapeHtml(inv.invoice_number)}</td>
          <td>${escapeHtml(inv.customer_name)}</td>
          <td>${new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
          <td>₹ ${Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="color:#ef4444; font-weight:600;">₹ ${Number(inv.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

// ================= INVOICE GENERATION & LISTING =================
async function loadInvoices() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/invoices', { headers: getBizHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('invoicesTableBody');
    const disputeSelect = document.getElementById('disputeInvoiceSelect');
    const paySelect = document.getElementById('payInvoiceSelect');

    disputeSelect.innerHTML = '<option value="">Select Invoice...</option>';
    paySelect.innerHTML = '<option value="">Select Invoice...</option>';

    if (!data.invoices || data.invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8;">No invoices created yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.invoices.map(inv => {
      if (Number(inv.balance_due) > 0.01) {
        disputeSelect.innerHTML += `<option value="${inv.id}">${inv.invoice_number} - ${inv.customer_name} (₹ ${inv.balance_due})</option>`;
        paySelect.innerHTML += `<option value="${inv.id}" data-balance="${inv.balance_due}">${inv.invoice_number} - ${inv.customer_name} (Balance: ₹ ${inv.balance_due})</option>`;
      }

      return `
        <tr>
          <td style="font-weight:600; color:#fff;">${escapeHtml(inv.invoice_number)}</td>
          <td>${escapeHtml(inv.customer_name)}</td>
          <td>${new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
          <td>${new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
          <td>₹ ${Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="color:#ef4444; font-weight:600;">₹ ${Number(inv.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
          <td>
            ${inv.pdf_path ? `<a href="${inv.pdf_path}" target="_blank" class="btn-secondary btn-sm" style="text-decoration:none;">📄 View PDF</a>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load invoices:', err);
  }
}

// Open Invoice Modal
const createInvoiceModal = document.getElementById('createInvoiceModal');
document.getElementById('btnOpenCreateInvModal').addEventListener('click', openCreateInvoiceModal);
document.getElementById('btnQuickCreateInv').addEventListener('click', openCreateInvoiceModal);
document.getElementById('btnCloseInvModal').addEventListener('click', () => createInvoiceModal.style.display = 'none');

function openCreateInvoiceModal() {
  createInvoiceModal.style.display = 'flex';
  clearAlert(document.getElementById('invModalAlert'));
  document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('invDueDate').value = '';

  const custSelect = document.getElementById('invCustomerSelect');
  custSelect.innerHTML = cachedCustomers.map(c => `<option value="${c.id}">${c.name} (${c.state || 'Karnataka'})</option>`).join('');

  document.getElementById('lineItemsContainer').innerHTML = '';
  addLineItemRow();
}

function addLineItemRow() {
  const container = document.getElementById('lineItemsContainer');
  const row = document.createElement('div');
  row.className = 'line-item-row';
  row.style.cssText = 'display:grid; grid-template-columns: 2fr 1fr 1fr 1fr 30px; gap:0.5rem; margin-bottom:0.75rem; align-items:center;';

  const productOpts = cachedProducts.map(p => `<option value="${p.id}" data-price="${p.selling_price}" data-gst="${p.gst_rate}">${p.name} (₹ ${p.selling_price})</option>`).join('');

  row.innerHTML = `
    <select class="item-prod-select" style="padding:0.5rem; background:#090d16; border:1px solid #334155; border-radius:4px; color:#fff;">
      <option value="">Custom Service / Product</option>
      ${productOpts}
    </select>
    <input type="number" class="item-qty" value="1" min="1" step="1" placeholder="Qty" style="padding:0.5rem; background:#090d16; border:1px solid #334155; border-radius:4px; color:#fff;">
    <input type="number" class="item-price" value="1000.00" step="0.01" placeholder="Unit Price" style="padding:0.5rem; background:#090d16; border:1px solid #334155; border-radius:4px; color:#fff;">
    <select class="item-gst" style="padding:0.5rem; background:#090d16; border:1px solid #334155; border-radius:4px; color:#fff;">
      <option value="0">0%</option>
      <option value="5">5%</option>
      <option value="12">12%</option>
      <option value="18" selected>18%</option>
      <option value="28">28%</option>
    </select>
    <button type="button" class="btn-remove-row" style="background:none; border:none; color:#ef4444; font-size:1.2rem; cursor:pointer;">&times;</button>
  `;

  const prodSelect = row.querySelector('.item-prod-select');
  const priceInput = row.querySelector('.item-price');
  const gstSelect = row.querySelector('.item-gst');

  prodSelect.addEventListener('change', () => {
    const selected = prodSelect.options[prodSelect.selectedIndex];
    if (selected && selected.value) {
      priceInput.value = selected.getAttribute('data-price');
      gstSelect.value = selected.getAttribute('data-gst');
    }
    recalculateLiveInvoice();
  });

  row.querySelector('.item-qty').addEventListener('input', recalculateLiveInvoice);
  priceInput.addEventListener('input', recalculateLiveInvoice);
  gstSelect.addEventListener('change', recalculateLiveInvoice);

  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    row.remove();
    recalculateLiveInvoice();
  });

  container.appendChild(row);
  recalculateLiveInvoice();
}

document.getElementById('btnAddLineItemRow').addEventListener('click', addLineItemRow);

function recalculateLiveInvoice() {
  let subtotal = 0;
  let tax = 0;
  const rows = document.querySelectorAll('.line-item-row');

  rows.forEach(r => {
    const qty = Number(r.querySelector('.item-qty').value) || 0;
    const price = Number(r.querySelector('.item-price').value) || 0;
    const gst = Number(r.querySelector('.item-gst').value) || 0;
    const lineSub = qty * price;
    subtotal += lineSub;
    tax += (lineSub * gst) / 100;
  });

  const grandTotal = subtotal + tax;
  document.getElementById('liveSubtotal').textContent = `₹ ${subtotal.toFixed(2)}`;
  document.getElementById('liveTax').textContent = `₹ ${tax.toFixed(2)}`;
  document.getElementById('liveGrandTotal').textContent = `₹ ${grandTotal.toFixed(2)}`;
}

// Submit Invoice Generation
document.getElementById('createInvoiceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('invModalAlert');
  clearAlert(alertEl);

  const customer_id = document.getElementById('invCustomerSelect').value;
  const invoice_date = document.getElementById('invDate').value;
  const due_date = document.getElementById('invDueDate').value;
  const po_reference = document.getElementById('invPoRef').value.trim();
  const payment_status = document.getElementById('invPaymentStatus').value;

  const rows = document.querySelectorAll('.line-item-row');
  const items = [];

  rows.forEach(r => {
    const prodSelect = r.querySelector('.item-prod-select');
    const selected = prodSelect.options[prodSelect.selectedIndex];
    const qty = Number(r.querySelector('.item-qty').value) || 1;
    const unitPrice = Number(r.querySelector('.item-price').value) || 0;
    const gstRate = Number(r.querySelector('.item-gst').value) || 18;

    items.push({
      product_id: selected && selected.value ? Number(selected.value) : null,
      product_name: selected && selected.value ? selected.text.split(' (')[0] : 'Professional Supply / Service',
      quantity: qty,
      unit_price: unitPrice,
      gst_rate: gstRate
    });
  });

  try {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: getBizHeaders(),
      body: JSON.stringify({ customer_id, invoice_date, due_date, po_reference, items, payment_status })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(alertEl, data.error || 'Failed to generate invoice.');

    createInvoiceModal.style.display = 'none';
    await loadInvoices();
    await loadDashboardMetrics();
    await loadPayments();
    window.open(data.pdfUrl, '_blank');
  } catch (err) {
    showAlert(alertEl, 'Network error: ' + err.message);
  }
});

// ================= CUSTOMERS & PRODUCTS =================
async function loadCustomers() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/customers', { headers: getBizHeaders() });
    const data = await res.json();
    cachedCustomers = data.customers || [];

    const tbody = document.getElementById('customersTableBody');
    if (cachedCustomers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No customers registered yet.</td></tr>';
      return;
    }
    tbody.innerHTML = cachedCustomers.map(c => `
      <tr>
        <td style="font-weight:600; color:#fff;">${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone || 'N/A')}</td>
        <td>${escapeHtml(c.state || 'Karnataka')}</td>
        <td>${escapeHtml(c.gstin || 'Unregistered')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
}

// Add Customer Modal
const custModal = document.getElementById('customerModal');
document.getElementById('btnAddCustomerBtn').addEventListener('click', () => custModal.style.display = 'flex');
document.getElementById('btnCloseCustModal').addEventListener('click', () => custModal.style.display = 'none');
document.getElementById('newCustomerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const state = document.getElementById('custState').value.trim();
  const gstin = document.getElementById('custGSTIN').value.trim();
  const billing_address = document.getElementById('custBillingAddress').value.trim();

  try {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: getBizHeaders(),
      body: JSON.stringify({ name, email, phone, state, gstin, billing_address })
    });
    if (!res.ok) {
      const d = await res.json();
      return alert(d.error || 'Failed to save customer');
    }
    custModal.style.display = 'none';
    document.getElementById('newCustomerForm').reset();
    loadCustomers();
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});

// Products
async function loadProducts() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/products', { headers: getBizHeaders() });
    const data = await res.json();
    cachedProducts = data.products || [];

    const tbody = document.getElementById('productsTableBody');
    if (cachedProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No products found.</td></tr>';
      return;
    }
    tbody.innerHTML = cachedProducts.map(p => `
      <tr>
        <td style="font-weight:600; color:#fff;">${escapeHtml(p.name)} ${p.sku ? `<span style="font-size:0.75rem; color:#94a3b8;">(${p.sku})</span>` : ''}</td>
        <td>${escapeHtml(p.unit || 'PCS')}</td>
        <td>₹ ${Number(p.selling_price).toFixed(2)}</td>
        <td>${p.gst_rate}%</td>
        <td><span class="badge badge-paid">${p.is_active ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

// Add Product Modal
const prodModal = document.getElementById('productModal');
document.getElementById('btnAddProductBtn').addEventListener('click', () => prodModal.style.display = 'flex');
document.getElementById('btnCloseProdModal').addEventListener('click', () => prodModal.style.display = 'none');
document.getElementById('newProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('prodName').value.trim();
  const sku = document.getElementById('prodSku').value.trim();
  const cost_price = document.getElementById('prodCost').value;
  const selling_price = document.getElementById('prodSelling').value;
  const gst_rate = document.getElementById('prodGst').value;
  const unit = document.getElementById('prodUnit').value;

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getBizHeaders(),
      body: JSON.stringify({ name, sku, cost_price, selling_price, gst_rate, unit })
    });
    if (!res.ok) {
      const d = await res.json();
      return alert(d.error || 'Failed to save product');
    }
    prodModal.style.display = 'none';
    document.getElementById('newProductForm').reset();
    loadProducts();
  } catch (err) {
    alert('Network error: ' + err.message);
  }
});

// ================= PAYMENT RECONCILIATION =================
async function loadPayments() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/payments', { headers: getBizHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('paymentsTableBody');
    if (!data.payments || data.payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No payments recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.payments.map(p => `
      <tr>
        <td style="font-weight:600; color:#fff;">${escapeHtml(p.invoice_number)} <span style="font-size:0.75rem; color:#94a3b8;">(${escapeHtml(p.customer_name)})</span></td>
        <td>${new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
        <td style="color:#10b981; font-weight:700;">₹ ${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>${escapeHtml(p.payment_method || 'Bank Transfer')}</td>
        <td>${escapeHtml(p.reference_no || 'N/A')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load payments:', err);
  }
}

const payModal = document.getElementById('paymentModal');
document.getElementById('btnRecordPaymentModal').addEventListener('click', () => {
  payModal.style.display = 'flex';
  document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
  const paySelect = document.getElementById('payInvoiceSelect');
  if (paySelect.selectedIndex >= 0 && paySelect.options[paySelect.selectedIndex]) {
    const selected = paySelect.options[paySelect.selectedIndex];
    const bal = selected.getAttribute('data-balance');
    if (bal) {
      document.getElementById('payAmount').value = bal;
      document.getElementById('payAmount').max = bal;
    }
  }
});
document.getElementById('btnClosePayModal').addEventListener('click', () => payModal.style.display = 'none');

document.getElementById('payInvoiceSelect').addEventListener('change', () => {
  const paySelect = document.getElementById('payInvoiceSelect');
  const selected = paySelect.options[paySelect.selectedIndex];
  if (selected) {
    const bal = selected.getAttribute('data-balance');
    if (bal) {
      document.getElementById('payAmount').value = bal;
      document.getElementById('payAmount').max = bal;
    }
  }
});

document.getElementById('recordPaymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('payModalAlert');
  clearAlert(alertEl);

  const invoice_id = document.getElementById('payInvoiceSelect').value;
  const amount = document.getElementById('payAmount').value;
  const payment_date = document.getElementById('payDate').value;
  const payment_method = document.getElementById('payMethod').value;
  const reference_no = document.getElementById('payRef').value.trim();

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: getBizHeaders(),
      body: JSON.stringify({ invoice_id, amount, payment_date, payment_method, reference_no })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(alertEl, data.error || 'Payment failed.');

    payModal.style.display = 'none';
    document.getElementById('recordPaymentForm').reset();
    
    // Immediately reload invoices, dashboard metrics, and payment list
    await loadInvoices();
    await loadDashboardMetrics();
    await loadPayments();
  } catch (err) {
    showAlert(alertEl, 'Network error: ' + err.message);
  }
});

// ================= UPLOAD & DIGITAL EXTRACTION =================
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('invoiceFileInput');
  if (!fileInput.files || fileInput.files.length === 0) return alert('Select a file.');

  const formData = new FormData();
  formData.append('invoice_file', fileInput.files[0]);

  const alertBox = document.getElementById('uploadAlert');
  clearAlert(alertBox);

  try {
    const res = await fetch('/api/invoices/upload', {
      method: 'POST',
      headers: { 'x-business-id': currentBusinessId },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) return showAlert(alertBox, data.error || 'Upload failed.');

    showAlert(alertBox, 'Document parsed successfully!', 'success');
    const ext = data.extractedData || {};

    document.getElementById('extractionReviewBox').innerHTML = `
      <div style="background:#090d16; border:1px solid #1e293b; border-radius:6px; padding:1.25rem;">
        <div style="font-weight:700; color:#10b981; margin-bottom:0.75rem;">Verified Digital Extraction</div>
        <div style="margin-bottom:0.4rem;"><strong>Invoice #:</strong> ${escapeHtml(ext.invoice_number || 'Uncertain')}</div>
        <div style="margin-bottom:0.4rem;"><strong>GSTIN:</strong> ${escapeHtml(ext.customer_gstin || 'None detected')}</div>
        <div style="margin-bottom:0.4rem;"><strong>Invoice Date:</strong> ${ext.invoice_date || 'N/A'}</div>
        <div style="margin-bottom:0.4rem;"><strong>Grand Total:</strong> ₹ ${Number(ext.grand_total || 0).toFixed(2)}</div>
        ${data.duplicateWarning ? '<div style="color:#ef4444; font-weight:700; margin-top:0.75rem;">⚠️ Potential Duplicate: An invoice with this number already exists.</div>' : ''}
      </div>
    `;
  } catch (err) {
    showAlert(alertBox, 'Network error: ' + err.message);
  }
});

// ================= REMINDERS =================
async function loadReminderLogs() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/reminders/logs', { headers: getBizHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('reminderLogsTableBody');
    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No reminder logs recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.logs.map(log => `
      <tr>
        <td style="font-weight:600; color:#fff;">${escapeHtml(log.invoice_number)}</td>
        <td>${escapeHtml(log.recipient_email)}</td>
        <td><span class="badge badge-partial">${escapeHtml(log.reminder_type)}</span></td>
        <td><span class="badge ${log.status === 'sent' || log.status === 'mock_delivered' ? 'badge-paid' : 'badge-overdue'}">${log.status}</span></td>
        <td>${log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN') : 'Pending'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load reminder logs:', err);
  }
}

document.getElementById('btnTriggerReminderCycle').addEventListener('click', async () => {
  const alertEl = document.getElementById('reminderAlert');
  clearAlert(alertEl);
  try {
    const res = await fetch('/api/reminders/trigger', { method: 'POST', headers: getBizHeaders() });
    const data = await res.json();
    showAlert(alertEl, `Scheduler cycle executed. Dispatched ${data.result ? data.result.dispatchedCount : 0} reminders.`, 'success');
    loadReminderLogs();
    loadDashboardMetrics();
  } catch (err) {
    showAlert(alertEl, 'Failed to trigger cycle: ' + err.message);
  }
});

document.getElementById('btnTestSendReminder').addEventListener('click', async () => {
  const testEmail = prompt('Enter recipient email for mock/test reminder:');
  if (!testEmail) return;
  const invSelect = document.getElementById('disputeInvoiceSelect');
  if (!invSelect.value) return alert('Please select an invoice first.');

  try {
    const res = await fetch('/api/reminders/test-send', {
      method: 'POST',
      headers: getBizHeaders(),
      body: JSON.stringify({ invoice_id: invSelect.value, test_email: testEmail })
    });
    const d = await res.json();
    alert(d.message || 'Dispatched');
    loadReminderLogs();
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

// ================= AGENTIC AI DISPUTES =================
async function loadDisputeCases() {
  if (!currentBusinessId) return;
  try {
    const res = await fetch('/api/ai/cases', { headers: getBizHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('disputeCasesTableBody');
    if (!data.cases || data.cases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No dispute cases filed yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.cases.map(c => `
      <tr>
        <td style="font-weight:600; color:#fff;">${escapeHtml(c.case_number)}</td>
        <td>${escapeHtml(c.invoice_number)}</td>
        <td>${escapeHtml(c.customer_name)}</td>
        <td style="color:#ef4444; font-weight:700;">₹ ${Number(c.total_claimed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td><span class="badge ${c.msme_samadhaan_ready ? 'badge-paid' : 'badge-overdue'}">${c.msme_samadhaan_ready ? 'Evidence Verified & Ready' : 'Gathering Evidence'}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load dispute cases:', err);
  }
}

document.getElementById('btnRunAIAgent').addEventListener('click', async () => {
  const invoiceId = document.getElementById('disputeInvoiceSelect').value;
  if (!invoiceId) return alert('Select an invoice to run multi-agent evaluation.');

  const resultsBox = document.getElementById('aiAnalysisResults');
  resultsBox.style.display = 'block';
  resultsBox.innerHTML = '<div style="padding:1.5rem; color:#94a3b8;">Launching multi-agent pipeline: Financial Validator, Evidence Verifier, Penal Interest Calculator...</div>';

  try {
    const res = await fetch('/api/ai/dispute-prep', {
      method: 'POST',
      headers: getBizHeaders(),
      body: JSON.stringify({ invoice_id: invoiceId })
    });
    const data = await res.json();
    if (!res.ok) return resultsBox.innerHTML = `<div style="padding:1.5rem; color:#ef4444;">${data.error || 'Evaluation failed'}</div>`;

    const f = data.findings;
    resultsBox.innerHTML = `
      <div style="padding:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:1rem; margin-bottom:1rem;">
          <h3 style="color:#fff; font-size:1.1rem;">Agentic AI Case Evaluation: ${data.caseNumber}</h3>
          <span class="badge ${data.evidenceReady ? 'badge-paid' : 'badge-overdue'}">${data.evidenceReady ? 'MSME Samadhaan Ready' : 'Incomplete Evidence'}</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:1.5rem;">
          <div style="background:#090d16; padding:1rem; border-radius:6px;">
            <div style="font-size:0.75rem; color:#94a3b8;">Principal Balance Due</div>
            <div style="font-size:1.2rem; font-weight:700; color:#fff;">₹ ${Number(f.overdue.principalDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="background:#090d16; padding:1rem; border-radius:6px;">
            <div style="font-size:0.75rem; color:#94a3b8;">3x RBI Penal Interest (19.5% p.a.)</div>
            <div style="font-size:1.2rem; font-weight:700; color:#f59e0b;">+ ₹ ${Number(f.overdue.statutoryPenalInterestClaimable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="background:#090d16; padding:1rem; border-radius:6px;">
            <div style="font-size:0.75rem; color:#94a3b8;">Total Statutory Claimable</div>
            <div style="font-size:1.2rem; font-weight:700; color:#ef4444;">₹ ${Number(f.overdue.totalMSMEClaim).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style="background:#090d16; padding:1rem; border-radius:6px; font-size:0.875rem; color:#94a3b8; line-height:1.6;">
          <div style="color:#fff; font-weight:600; margin-bottom:0.4rem;">Evidence & Statutory Verification Summary:</div>
          <div>• <strong>Financial Match:</strong> ${f.financial.status} (${f.financial.notes})</div>
          <div>• <strong>Evidence Strength:</strong> ${f.evidence.score}</div>
          <div>• <strong>Days Overdue:</strong> ${data.daysOverdue} days (Section 16 MSMED Act triggered)</div>
        </div>
      </div>
    `;

    loadDisputeCases();
  } catch (err) {
    resultsBox.innerHTML = `<div style="padding:1.5rem; color:#ef4444;">Error: ${err.message}</div>`;
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initial Boot
checkActiveSession();
