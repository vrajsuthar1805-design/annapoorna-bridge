// Annapoorna Bridge API Client & Shared State Management

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? `${window.location.origin}/api`
  : '/api';

// Token & Session Storage
const Auth = {
  getToken: () => localStorage.getItem('ab_token'),
  setToken: (token) => localStorage.setItem('ab_token', token),
  removeToken: () => localStorage.removeItem('ab_token'),

  getUser: () => {
    try {
      const u = localStorage.getItem('ab_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('ab_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('ab_user'),

  isLoggedIn: () => !!localStorage.getItem('ab_token'),
  getRole: () => {
    const u = Auth.getUser();
    return u ? u.role : null;
  },

  logout: () => {
    Auth.removeToken();
    Auth.removeUser();
    window.location.href = 'index.html';
  }
};

// Generic Fetch Wrapper with Authorization
async function apiRequest(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }
    return json;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}

// Toast Notification System
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Countdown Formatter
function calculateRemaining(safeUntilTimestamp) {
  const safeTime = new Date(safeUntilTimestamp).getTime();
  const diffMs = safeTime - Date.now();
  if (diffMs <= 0) {
    return { text: 'EXPIRED', urgent: false, expired: true, minutes: 0 };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const urgent = totalMinutes <= 120; // < 2 hours is critical urgent
  const text = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left (URGENT)`;

  return { text, urgent, expired: false, minutes: totalMinutes };
}

// Pre-configured Quick Demo Logins for Instant Testing
const DEMO_ACCOUNTS = {
  donor: {
    email: 'donor.chola@annapoornabridge.org',
    password: 'Password123!',
    role: 'donor',
    dashboard: 'dashboard-donor.html'
  },
  ngo: {
    email: 'ngo.robinhood@annapoornabridge.org',
    password: 'Password123!',
    role: 'ngo',
    dashboard: 'dashboard-ngo.html'
  },
  ngo_mumbai: {
    email: 'ngo.rotibank@annapoornabridge.org',
    password: 'Password123!',
    role: 'ngo',
    dashboard: 'dashboard-ngo.html'
  },
  admin: {
    email: 'admin@annapoornabridge.org',
    password: 'AdminPassword123!',
    role: 'admin',
    dashboard: 'dashboard-admin.html'
  }
};

async function quickDemoLogin(roleKey) {
  const creds = DEMO_ACCOUNTS[roleKey];
  if (!creds) return;

  try {
    showToast(`Logging in as Demo ${creds.role.toUpperCase()}...`, 'info');
    const res = await apiRequest('/auth/login', 'POST', {
      email: creds.email,
      password: creds.password
    });

    Auth.setToken(res.token);
    Auth.setUser(res.user);
    showToast(`Welcome ${res.user.name}! Redirecting to dashboard...`, 'success');

    setTimeout(() => {
      window.location.href = creds.dashboard;
    }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Shared Navigation Header Updater
function updateNavSessionUI() {
  const user = Auth.getUser();
  const authNav = document.getElementById('navAuthActions');
  const userNav = document.getElementById('navUserActions');

  if (!authNav || !userNav) return;

  if (user) {
    authNav.style.display = 'none';
    userNav.style.display = 'flex';

    const userNameEl = document.getElementById('navUserName');
    const userRoleEl = document.getElementById('navUserRole');
    const dashLinkEl = document.getElementById('navDashboardLink');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) {
      userRoleEl.textContent = user.role.toUpperCase();
      userRoleEl.className = `role-badge role-${user.role}`;
    }
    if (dashLinkEl) {
      if (user.role === 'donor') dashLinkEl.href = 'dashboard-donor.html';
      else if (user.role === 'ngo') dashLinkEl.href = 'dashboard-ngo.html';
      else if (user.role === 'admin') dashLinkEl.href = 'dashboard-admin.html';
    }
  } else {
    authNav.style.display = 'flex';
    userNav.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', updateNavSessionUI);
