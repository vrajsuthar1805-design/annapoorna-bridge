// Annapoorna Bridge Core Application Logic (Auth Modals, Impact Loaders, Shared UI)

// Open Authentication Modal
function openAuthModal(defaultTab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('active');
  switchAuthTab(defaultTab);
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

// Switch Auth Tabs (Login vs Register Donor vs Register NGO)
function switchAuthTab(tabName) {
  const tabs = document.querySelectorAll('.auth-tab-btn');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  forms.forEach(f => f.classList.toggle('active', f.id === `form-${tabName}`));

  const roleField = document.getElementById('regRole');
  const donorFields = document.getElementById('donorExtraFields');
  const ngoFields = document.getElementById('ngoExtraFields');

  if (tabName === 'register-donor') {
    if (roleField) roleField.value = 'donor';
    if (donorFields) donorFields.style.display = 'block';
    if (ngoFields) ngoFields.style.display = 'none';
  } else if (tabName === 'register-ngo') {
    if (roleField) roleField.value = 'ngo';
    if (donorFields) donorFields.style.display = 'none';
    if (ngoFields) ngoFields.style.display = 'block';
  }
}

// Handle Login Form Submit
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    Auth.setToken(res.token);
    Auth.setUser(res.user);
    showToast(`Welcome back, ${res.user.name}!`, 'success');
    closeAuthModal();

    setTimeout(() => {
      if (res.user.role === 'donor') window.location.href = 'dashboard-donor.html';
      else if (res.user.role === 'ngo') window.location.href = 'dashboard-ngo.html';
      else if (res.user.role === 'admin') window.location.href = 'dashboard-admin.html';
      else window.location.reload();
    }, 500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Register Form Submit
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value.trim();
  const city = document.getElementById('regCity').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const role = document.getElementById('regRole').value;

  const payload = { name, email, password, phone, city, address, role };

  if (role === 'donor') {
    payload.donorDetails = {
      organizationType: document.getElementById('regDonorType').value,
      licenseNumber: document.getElementById('regLicense').value.trim(),
      contactPerson: document.getElementById('regContactPerson').value.trim()
    };
  } else if (role === 'ngo') {
    payload.ngoDetails = {
      darpanId: document.getElementById('regDarpanId').value.trim(),
      trustRegNo: document.getElementById('regTrustReg').value.trim(),
      servingCapacityPerDay: Number(document.getElementById('regCapacity').value) || 500
    };
  }

  try {
    const res = await apiRequest('/auth/register', 'POST', payload);
    Auth.setToken(res.token);
    Auth.setUser(res.user);
    showToast('Registration successful! Welcome to the Annapoorna redistribution network.', 'success');
    closeAuthModal();

    setTimeout(() => {
      if (res.user.role === 'donor') window.location.href = 'dashboard-donor.html';
      else if (res.user.role === 'ngo') window.location.href = 'dashboard-ngo.html';
      else window.location.reload();
    }, 500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load Real-time SDG Impact Metrics onto Index Page
async function loadImpactMetrics() {
  try {
    const res = await apiRequest('/metrics/impact');
    if (!res.success) return;

    const m = res.metrics;
    const kgEl = document.getElementById('statKgRescued');
    const mealsEl = document.getElementById('statMealsServed');
    const co2El = document.getElementById('statCo2Diverted');
    const ngosEl = document.getElementById('statVerifiedNgos');

    if (kgEl) animateCounter(kgEl, m.totalKgRescued);
    if (mealsEl) animateCounter(mealsEl, m.mealsServed);
    if (co2El) animateCounter(co2El, m.co2DivertedKg);
    if (ngosEl) animateCounter(ngosEl, m.verifiedNgos);

    // Update ticker
    const tickerTrack = document.getElementById('liveTickerTrack');
    if (tickerTrack && m.recentRescues && m.recentRescues.length > 0) {
      tickerTrack.innerHTML = m.recentRescues.map(r => `
        <span class="ticker-item">
          <strong style="color: #15803d;">[${r.city}]</strong> ${r.title} — 
          <em>${r.plates} plates (${r.kg} kg)</em> handled by <strong>${r.claimedBy}</strong>
        </span>
      `).join(' &nbsp;•&nbsp; ');
    }
  } catch (err) {
    console.warn('Could not load impact metrics:', err.message);
  }
}

function animateCounter(el, target) {
  let current = 0;
  const duration = 1200;
  const step = Math.max(1, Math.ceil(target / (duration / 25)));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current.toLocaleString('en-IN');
  }, 25);
}

// Global modal dismiss on escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
    const safetyModal = document.getElementById('safetyModal');
    if (safetyModal) safetyModal.classList.remove('active');
  }
});
