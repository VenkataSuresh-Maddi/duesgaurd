const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotForm = document.getElementById('forgotForm');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginLink = document.getElementById('backToLoginLink');
const authTabs = document.getElementById('authTabs');
const authSubtitle = document.getElementById('authSubtitle');
const alertBox = document.getElementById('alertBox');
const loggedInState = document.getElementById('loggedInState');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userInitialEl = document.getElementById('userInitial');
const logoutBtn = document.getElementById('logoutBtn');

// Point to backend server on 3000 if page was opened via Live Server (e.g. port 5500)
const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert-box ${type}`;
}

function clearAlert() {
  alertBox.textContent = '';
  alertBox.className = 'alert-box';
}

function switchTab(mode) {
  clearAlert();
  forgotForm.style.display = 'none';
  authTabs.style.display = 'flex';

  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    authSubtitle.textContent = 'Welcome back. Enter your credentials to access your account.';
  } else if (mode === 'signup') {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
    authSubtitle.textContent = 'Get started with DuesGuard by creating your account.';
  } else if (mode === 'forgot') {
    authTabs.style.display = 'none';
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    forgotForm.style.display = 'block';
    authSubtitle.textContent = 'Enter your email to set a new password.';
  }
}

tabLogin.addEventListener('click', () => switchTab('login'));
tabSignup.addEventListener('click', () => switchTab('signup'));
forgotPasswordLink.addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('forgot');
});
backToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('login');
});

// Handle Password Reset
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const email = document.getElementById('forgotEmail').value.trim();
  const newPassword = document.getElementById('newPassword').value;

  try {
    const res = await fetch(`${API_BASE}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Server returned an invalid response (Status ' + res.status + ')' };
    }

    if (!res.ok) {
      return showAlert(data.error || 'Password reset failed.');
    }

    showAlert(data.message, 'success');
    forgotForm.reset();
    setTimeout(() => {
      switchTab('login');
      document.getElementById('loginEmail').value = email;
    }, 1500);
  } catch (err) {
    showAlert('Network error: ' + err.message);
  }
});

// Handle Signup
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const res = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Server returned an invalid response (Status ' + res.status + ')' };
    }

    if (!res.ok) {
      return showAlert(data.error || 'Signup failed.');
    }

    showAlert('Account created successfully! You can now log in.', 'success');
    signupForm.reset();
    setTimeout(() => {
      switchTab('login');
      document.getElementById('loginEmail').value = email;
    }, 1200);
  } catch (err) {
    showAlert('Network error: ' + err.message);
  }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Server returned an invalid response (Status ' + res.status + ')' };
    }

    if (!res.ok) {
      return showAlert(data.error || 'Login failed.');
    }

    // Success State
    clearAlert();
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'none';
    if (authTabs) authTabs.style.display = 'none';
    
    const subtitle = document.getElementById('authSubtitle');
    if (subtitle) subtitle.textContent = 'You have logged in successfully.';

    const nameTarget = document.getElementById('userName');
    if (nameTarget) nameTarget.textContent = (data.user && data.user.name) ? data.user.name : 'User';

    const emailTarget = document.getElementById('userEmail');
    if (emailTarget) emailTarget.textContent = (data.user && data.user.email) ? data.user.email : '';

    const initialTarget = document.getElementById('userInitial');
    if (initialTarget) {
      const initial = (data.user && data.user.name) ? data.user.name.charAt(0).toUpperCase() : 'U';
      initialTarget.textContent = initial;
    }

    const stateTarget = document.getElementById('loggedInState');
    if (stateTarget) stateTarget.style.display = 'block';

    const emailBadge = document.getElementById('bizUserEmailBadge');
    if (emailBadge && data.user) emailBadge.textContent = data.user.email;

    // Load registered businesses for this logged-in user
    if (data.user && data.user.email) {
      currentUserEmail = data.user.email;
      loadBusinesses(data.user.email);
    }
  } catch (err) {
    showAlert('Network error: ' + err.message);
  }
});

let currentUserEmail = '';

function showBizAlert(message, type = 'error') {
  const bizAlertBox = document.getElementById('bizAlertBox');
  if (!bizAlertBox) return;
  bizAlertBox.textContent = message;
  bizAlertBox.className = `alert-box ${type}`;
}

async function loadBusinesses(email) {
  const listEl = document.getElementById('businessesList');
  if (!listEl) return;

  try {
    const res = await fetch(`${API_BASE}/api/businesses?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!res.ok) return;

    if (!data.businesses || data.businesses.length === 0) {
      listEl.innerHTML = '<p class="empty-list-text">No businesses registered yet.</p>';
      return;
    }

    listEl.innerHTML = data.businesses.map(b => `
      <div class="biz-card">
        <div>
          <div class="biz-card-name">${escapeHtml(b.business_name)}</div>
          <div class="biz-card-meta">
            ${b.phone ? '📞 ' + escapeHtml(b.phone) + ' • ' : ''}
            ${b.address ? escapeHtml(b.address) : 'No address provided'}
          </div>
        </div>
        <span class="biz-card-tag">${escapeHtml(b.business_type || 'General')}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load businesses:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Business registration form submission
const businessForm = document.getElementById('businessForm');
if (businessForm) {
  businessForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bizAlertBox = document.getElementById('bizAlertBox');
    if (bizAlertBox) {
      bizAlertBox.className = 'alert-box';
      bizAlertBox.textContent = '';
    }

    if (!currentUserEmail) {
      showBizAlert('User session not found. Please log in again.');
      return;
    }

    const business_name = document.getElementById('bizName').value.trim();
    const business_type = document.getElementById('bizType').value.trim();
    const phone = document.getElementById('bizPhone').value.trim();
    const address = document.getElementById('bizAddress').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: currentUserEmail,
          business_name,
          business_type,
          phone,
          address
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return showBizAlert(data.error || 'Failed to register business.');
      }

      showBizAlert('Business registered successfully!', 'success');
      businessForm.reset();
      loadBusinesses(currentUserEmail);
    } catch (err) {
      showBizAlert('Network error: ' + err.message);
    }
  });
}

logoutBtn.addEventListener('click', () => {
  clearAlert();
  currentUserEmail = '';
  const bizAlertBox = document.getElementById('bizAlertBox');
  if (bizAlertBox) {
    bizAlertBox.className = 'alert-box';
    bizAlertBox.textContent = '';
  }
  loggedInState.style.display = 'none';
  authTabs.style.display = 'flex';
  loginForm.reset();
  switchTab('login');
});
