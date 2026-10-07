// ==========================================================
// ANNAPOORNA BRIDGE - Authentication & Session Management
// ==========================================================

const API_BASE = '/api';

let currentUser = null;

function getToken() {
  return localStorage.getItem('annapoorna_token');
}

function getUser() {
  const userStr = localStorage.getItem('annapoorna_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem('annapoorna_token', token);
  localStorage.setItem('annapoorna_user', JSON.stringify(user));
  currentUser = user;
  updateAuthUI();

  // Socket room joining
  if (window.joinUserRooms) {
    window.joinUserRooms(user);
  }
}

function clearSession() {
  localStorage.removeItem('annapoorna_token');
  localStorage.removeItem('annapoorna_user');
  currentUser = null;
  updateAuthUI();
}

function updateAuthUI() {
  const authActions = document.getElementById('authActions');
  const userProfile = document.getElementById('userProfile');
  const userOrgName = document.getElementById('userOrgName');
  const userRoleBadge = document.getElementById('userRoleBadge');

  const navDonorPostings = document.getElementById('nav-donor-postings');
  const navNgoClaims = document.getElementById('nav-ngo-claims');
  const navAdminHub = document.getElementById('nav-admin-hub');

  const mobNavDonor = document.getElementById('mob-nav-donor');
  const mobNavNgo = document.getElementById('mob-nav-ngo');
  const mobNavAdmin = document.getElementById('mob-nav-admin');

  currentUser = getUser();

  if (currentUser) {
    if (authActions) authActions.classList.add('hidden');
    if (userProfile) {
      userProfile.classList.remove('hidden');
      userProfile.classList.add('flex');
    }

    if (userOrgName) userOrgName.textContent = currentUser.orgName || currentUser.name;
    if (userRoleBadge) {
      userRoleBadge.textContent = currentUser.role.toUpperCase() + (currentUser.isVerified ? ' (Verified)' : ' (Pending)');
      if (currentUser.role === 'admin') {
        userRoleBadge.className = 'text-[10px] font-bold text-purple-700 capitalize leading-tight';
      } else if (currentUser.role === 'ngo') {
        userRoleBadge.className = 'text-[10px] font-bold text-blue-700 capitalize leading-tight';
      } else {
        userRoleBadge.className = 'text-[10px] font-bold text-emerald-700 capitalize leading-tight';
      }
    }

    // Role-specific navigation tabs
    if (navDonorPostings) {
      if (currentUser.role === 'donor' || currentUser.role === 'admin') {
        navDonorPostings.classList.remove('hidden');
        if (mobNavDonor) mobNavDonor.classList.remove('hidden');
      } else {
        navDonorPostings.classList.add('hidden');
        if (mobNavDonor) mobNavDonor.classList.add('hidden');
      }
    }

    if (navNgoClaims) {
      if (currentUser.role === 'ngo' || currentUser.role === 'admin') {
        navNgoClaims.classList.remove('hidden');
        if (mobNavNgo) mobNavNgo.classList.remove('hidden');
      } else {
        navNgoClaims.classList.add('hidden');
        if (mobNavNgo) mobNavNgo.classList.add('hidden');
      }
    }

    if (navAdminHub) {
      if (currentUser.role === 'admin') {
        navAdminHub.classList.remove('hidden');
        navAdminHub.classList.add('flex');
        if (mobNavAdmin) mobNavAdmin.classList.remove('hidden');
      } else {
        navAdminHub.classList.add('hidden');
        navAdminHub.classList.remove('flex');
        if (mobNavAdmin) mobNavAdmin.classList.add('hidden');
      }
    }

  } else {
    if (authActions) authActions.classList.remove('hidden');
    if (userProfile) {
      userProfile.classList.add('hidden');
      userProfile.classList.remove('flex');
    }

    if (navDonorPostings) navDonorPostings.classList.add('hidden');
    if (navNgoClaims) navNgoClaims.classList.add('hidden');
    if (navAdminHub) {
      navAdminHub.classList.add('hidden');
      navAdminHub.classList.remove('flex');
    }

    if (mobNavDonor) mobNavDonor.classList.add('hidden');
    if (mobNavNgo) mobNavNgo.classList.add('hidden');
    if (mobNavAdmin) mobNavAdmin.classList.add('hidden');
  }

  if (window.lucide) window.lucide.createIcons();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setSession(data.token, data.user);
    closeModal('loginModal');
    showToast(`Welcome back, ${data.user.name} (${data.user.orgName})!`, 'success');

    // Route intelligently based on role
    if (data.user.role === 'donor') {
      switchTab('donor-postings');
    } else if (data.user.role === 'ngo') {
      switchTab('feed');
    } else if (data.user.role === 'admin') {
      switchTab('admin-hub');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const role = document.querySelector('input[name="regRole"]:checked').value;
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const orgName = document.getElementById('regOrgName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const city = document.getElementById('regCity').value;
  const licenseOrDarpanId = document.getElementById('regLicenseId').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        name,
        email,
        orgName,
        phone,
        city,
        licenseOrDarpanId,
        address,
        password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    setSession(data.token, data.user);
    closeModal('registerModal');
    showToast('Registration successful! Welcome to Annapoorna Bridge.', 'success');
    switchTab('feed');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  clearSession();
  showToast('You have been signed out.', 'info');
  switchTab('feed');
}

// Quick 1-click login test helper
async function quickLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      setSession(data.token, data.user);
      showToast(`Switched to: ${data.user.name} [${data.user.role.toUpperCase()}]`, 'success');
      if (data.user.role === 'donor') switchTab('donor-postings');
      else if (data.user.role === 'ngo') switchTab('feed');
      else if (data.user.role === 'admin') switchTab('admin-hub');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function prefillLogin(email, password) {
  const elEmail = document.getElementById('loginEmail');
  const elPass = document.getElementById('loginPassword');
  if (elEmail) elEmail.value = email;
  if (elPass) elPass.value = password;
}

function toggleRegFields() {
  const role = document.querySelector('input[name="regRole"]:checked').value;
  const label = document.getElementById('regLicenseLabel');
  const input = document.getElementById('regLicenseId');
  if (role === 'donor') {
    label.textContent = 'FSSAI / Venue License No. *';
    input.placeholder = 'e.g. FSSAI-12345678901234';
  } else {
    label.textContent = 'NGO Darpan ID / Trust Registration *';
    input.placeholder = 'e.g. DARPAN-DL/2021/0199201';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  currentUser = getUser();
  updateAuthUI();
});
