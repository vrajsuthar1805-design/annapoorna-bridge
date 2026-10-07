// ==========================================================
// ANNAPOORNA BRIDGE - Main App Controller, Feed & Timers
// ==========================================================

let activeTab = 'feed';
let countdownInterval = null;

// Tab Switcher
function switchTab(tabId) {
  activeTab = tabId;

  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach((el) => {
    el.classList.add('hidden');
  });

  // Reset tab button styles
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.classList.remove('text-emerald-800', 'bg-emerald-50', 'font-semibold');
    btn.classList.add('text-slate-600', 'font-medium');
  });

  // Reveal target tab
  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // Highlight active nav button
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600', 'font-medium');
    activeBtn.classList.add('text-emerald-800', 'bg-emerald-50', 'font-semibold');
  }

  // Execute tab-specific fetches
  if (tabId === 'feed') {
    fetchListings();
  } else if (tabId === 'donor-postings') {
    fetchDonorListings();
  } else if (tabId === 'ngo-claims') {
    fetchNgoClaims();
  } else if (tabId === 'impact-hub') {
    loadAnalytics();
  } else if (tabId === 'admin-hub') {
    loadAdminData();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Fetch & Render Surplus Food Listings Feed
async function fetchListings() {
  const container = document.getElementById('listingsGrid');
  if (!container) return;

  const city = document.getElementById('filterCity') ? document.getElementById('filterCity').value : 'all';
  const diet = document.getElementById('filterDiet') ? document.getElementById('filterDiet').value : 'all';
  const category = document.getElementById('filterCategory') ? document.getElementById('filterCategory').value : 'all';
  const urgent = document.getElementById('filterUrgent') && document.getElementById('filterUrgent').checked ? 'true' : 'false';

  const params = new URLSearchParams();
  if (city !== 'all') params.append('city', city);
  if (diet !== 'all') params.append('dietaryType', diet);
  if (category !== 'all') params.append('foodType', category);
  if (urgent === 'true') params.append('urgentOnly', 'true');

  try {
    const res = await fetch(`${API_BASE}/listings?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to fetch listings');

    if (!data.listings || data.listings.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <i data-lucide="utensils" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
          <h3 class="text-base font-bold text-slate-800">No Active Surplus Listings</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">There are currently no matching surplus food batches in this category. Check back soon or switch filters.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = data.listings.map((item) => renderFeedCard(item)).join('');
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

// Render individual feed card
function renderFeedCard(item) {
  const isVeg = item.dietaryType === 'veg';
  const expiryTime = new Date(item.safeUntil).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;
  const isUrgent = diffMs > 0 && diffMs < 2 * 60 * 60 * 1000; // Less than 2 hours remaining
  const isExpired = diffMs <= 0;

  const donorName = item.donorId ? item.donorId.orgName : 'Donor Venue';
  const isDonorVerified = item.donorId ? item.donorId.isVerified : false;

  return `
    <div class="bg-white rounded-2xl shadow-sm border ${isUrgent ? 'border-red-400 countdown-urgent ring-1 ring-red-400' : 'border-slate-200'} overflow-hidden flex flex-col hover:shadow-lg transition">
      
      <!-- Card Image -->
      <div class="relative h-48 bg-slate-100 overflow-hidden">
        <img src="${item.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'}" alt="${item.foodTitle}" class="w-full h-full object-cover group-hover:scale-105 transition" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"></div>

        <!-- Badges -->
        <div class="absolute top-3 left-3 flex items-center gap-2">
          <span class="diet-badge ${isVeg ? 'veg' : 'non-veg'} shadow" title="${isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}"><span class="dot"></span></span>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-black/60 text-white backdrop-blur">
            ${item.foodType}
          </span>
        </div>

        <div class="absolute top-3 right-3">
          ${isUrgent
            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse shadow flex items-center gap-1">
                <span>⚡ Urgent (&lt; 2h)</span>
               </span>`
            : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white shadow">
                Available
               </span>`}
        </div>

        <div class="absolute bottom-3 left-3 right-3 text-white">
          <h3 class="font-bold text-base line-clamp-1">${item.foodTitle}</h3>
          <div class="flex items-center justify-between text-xs text-white/90 mt-0.5 font-medium">
            <span>🍛 ${item.quantityValue} ${item.quantityUnit} (~${item.metrics ? item.metrics.estimatedMeals : item.quantityValue} meals)</span>
            <span>📍 ${item.pickupCity}</span>
          </div>
        </div>
      </div>

      <!-- Card Details -->
      <div class="p-4 flex-grow flex flex-col justify-between text-xs space-y-3">
        
        <!-- Perishable Countdown Clock -->
        <div class="p-2.5 rounded-xl ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'} flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <i data-lucide="clock" class="w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-amber-600'}"></i>
            <span class="text-slate-700 font-semibold text-[11px]">Safe Window:</span>
          </div>
          <span class="font-mono font-bold text-xs ${isExpired ? 'text-slate-400' : isUrgent ? 'text-red-600' : 'text-emerald-700'} countdown-display" data-expire="${item.safeUntil}">
            ${isExpired ? 'EXPIRED' : 'Calculating...'}
          </span>
        </div>

        <!-- Venue / Donor Info -->
        <div class="space-y-1 text-[11px] text-slate-600">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 line-clamp-1">${donorName}</span>
            ${isDonorVerified ? '<span class="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">✓ Verified</span>' : ''}
          </div>
          <div class="text-slate-500 line-clamp-1">📍 ${item.pickupAddress}</div>
          <div class="flex items-center justify-between text-slate-500 pt-0.5">
            <span>Storage: <strong class="text-slate-700 font-medium">${item.storageCondition}</strong></span>
          </div>
        </div>

        <!-- Claim Action Button -->
        <div class="pt-1">
          <button onclick="openClaimModal('${item._id}', '${item.foodTitle.replace(/'/g, "\\'")}', '${item.quantityValue} ${item.quantityUnit}')" class="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition flex items-center justify-center gap-1.5 text-xs">
            <i data-lucide="hand-metal" class="w-3.5 h-3.5"></i>
            Claim Surplus Batch (One-Click)
          </button>
        </div>

      </div>

    </div>
  `;
}

// Global 1-second interval to tick down all countdown timers
function startCountdownTickers() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const displays = document.querySelectorAll('.countdown-display');
    const now = Date.now();

    displays.forEach((el) => {
      const expireStr = el.getAttribute('data-expire');
      if (!expireStr) return;

      const expireTime = new Date(expireStr).getTime();
      const diffMs = expireTime - now;

      if (diffMs <= 0) {
        el.textContent = 'EXPIRED';
        el.className = 'font-mono font-bold text-xs text-slate-400';
      } else {
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
        el.textContent = formatted;

        if (diffMs < 2 * 60 * 60 * 1000) {
          el.className = 'font-mono font-bold text-xs text-red-600 animate-pulse';
        }
      }
    });
  }, 1000);
}

// Load UN SDG Impact Analytics
async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/analytics/impact`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Analytics load failed');

    // Update Hero counters
    const metricMeals = document.getElementById('metricMeals');
    const metricKg = document.getElementById('metricKg');
    const metricCo2 = document.getElementById('metricCo2');

    if (metricMeals) metricMeals.textContent = data.summary.totalMealsServed.toLocaleString();
    if (metricKg) metricKg.textContent = data.summary.totalKgRescued.toLocaleString();
    if (metricCo2) metricCo2.textContent = data.summary.co2DivertedKg.toLocaleString();

    // Update Analytics Tab values
    const anaMeals = document.getElementById('anaMeals');
    const anaKg = document.getElementById('anaKg');
    const anaCo2 = document.getElementById('anaCo2');
    const anaPartners = document.getElementById('anaPartners');

    if (anaMeals) anaMeals.textContent = data.summary.totalMealsServed.toLocaleString();
    if (anaKg) anaKg.textContent = data.summary.totalKgRescued.toLocaleString() + ' kg';
    if (anaCo2) anaCo2.textContent = data.summary.co2DivertedKg.toLocaleString() + ' kg';
    if (anaPartners) anaPartners.textContent = `${data.summary.verifiedDonors + data.summary.verifiedNgos}`;

    // City Breakdown
    const cityContainer = document.getElementById('anaCityBreakdown');
    if (cityContainer && data.cityDistribution) {
      const cities = Object.entries(data.cityDistribution);
      if (cities.length === 0) {
        cityContainer.innerHTML = '<div class="text-slate-400">No city distributions recorded.</div>';
      } else {
        cityContainer.innerHTML = cities
          .map(
            ([city, s]) => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span class="font-bold text-slate-800">📍 ${city}</span>
            <span class="text-slate-600 font-semibold">${s.meals.toLocaleString()} meals (${s.kgRescued} kg)</span>
          </div>
        `
          )
          .join('');
      }
    }

    // Dietary Breakdown
    const dietContainer = document.getElementById('anaDietaryBreakdown');
    if (dietContainer && data.dietaryDistribution) {
      const vegMeals = data.dietaryDistribution.veg ? data.dietaryDistribution.veg.meals : 0;
      const nonVegMeals = data.dietaryDistribution['non-veg'] ? data.dietaryDistribution['non-veg'].meals : 0;
      const total = vegMeals + nonVegMeals || 1;

      const vegPercent = Math.round((vegMeals / total) * 100);
      const nonVegPercent = 100 - vegPercent;

      dietContainer.innerHTML = `
        <div>
          <div class="flex items-center justify-between text-xs mb-1 font-semibold">
            <span class="text-emerald-700">🟢 Pure Vegetarian (${vegMeals} meals)</span>
            <span>${vegPercent}%</span>
          </div>
          <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div class="bg-emerald-600 h-full rounded-full" style="width: ${vegPercent}%"></div>
          </div>
        </div>

        <div class="mt-2">
          <div class="flex items-center justify-between text-xs mb-1 font-semibold">
            <span class="text-red-700">🔴 Non-Vegetarian (${nonVegMeals} meals)</span>
            <span>${nonVegPercent}%</span>
          </div>
          <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div class="bg-red-600 h-full rounded-full" style="width: ${nonVegPercent}%"></div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.warn('[Analytics] Load error:', err.message);
  }
}

// Modal Management
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColor =
    type === 'success'
      ? 'bg-emerald-800 text-white'
      : type === 'error'
      ? 'bg-red-800 text-white'
      : 'bg-slate-900 text-white';

  toast.className = `p-3.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center justify-between gap-3 pointer-events-auto transform translate-y-2 transition duration-200 ${bgColor}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Mobile Menu Toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('hidden');
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  fetchListings();
  loadAnalytics();
  startCountdownTickers();
});
