// Annapoorna Bridge Donor Dashboard Controller

let myPostings = [];
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getUser();
  if (!user || (user.role !== 'donor' && user.role !== 'admin')) {
    showToast('Please log in with a Donor account to access the Donor Command Center.', 'error');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return;
  }

  // Populate Donor Details in Header
  document.getElementById('donorVenueName').textContent = user.name;
  document.getElementById('donorCity').textContent = user.city;
  document.getElementById('donorPhone').textContent = user.phone;
  if (user.donorDetails && user.donorDetails.licenseNumber) {
    document.getElementById('donorLicenseBadge').textContent = `License: ${user.donorDetails.licenseNumber}`;
  }

  // Set default cooked time to 1 hour ago
  const cookedInput = document.getElementById('cookedTime');
  if (cookedInput) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    cookedInput.value = oneHourAgo.toISOString().slice(0, 16);
    validateCookedTime();
    cookedInput.addEventListener('input', validateCookedTime);
    cookedInput.addEventListener('change', validateCookedTime);
  }

  // Attach Plate/Kg Auto Estimator (Standard: 1 kg ≈ 2 to 3 meals)
  const kgInput = document.getElementById('estimatedQuantityKg');
  const platesInput = document.getElementById('estimatedPlates');
  if (kgInput && platesInput) {
    kgInput.addEventListener('input', () => {
      const kg = parseFloat(kgInput.value) || 0;
      platesInput.value = Math.round(kg * 2); // 1 kg = 2 to 3 meals
    });
    platesInput.addEventListener('input', () => {
      const plates = parseFloat(platesInput.value) || 0;
      kgInput.value = Math.round(plates / 2);
    });
  }

  // Form submit handler
  const form = document.getElementById('postSurplusForm');
  if (form) {
    form.addEventListener('submit', handlePostListing);
  }

  // Load postings
  await loadDonorPostings();

  // Start live 1-second countdown refresher
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(refreshCountdowns, 1000);

  // Real-time Socket Event Listeners
  window.addEventListener('ab:listing_claimed', (e) => {
    // If one of our listings was claimed, refresh immediately
    loadDonorPostings();
  });
  window.addEventListener('ab:listing_status_updated', (e) => {
    loadDonorPostings();
  });
});

// Load Donor's Postings
async function loadDonorPostings() {
  try {
    const res = await apiRequest('/listings/my/postings');
    if (res.success) {
      myPostings = res.listings;
      renderPostings();
      updateDonorStats();
    }
  } catch (err) {
    showToast('Failed to load listings: ' + err.message, 'error');
  }
}

// Render Listings into Active vs Delivered/Expired
function renderPostings() {
  const activeContainer = document.getElementById('activePostingsGrid');
  const pastContainer = document.getElementById('pastPostingsGrid');
  if (!activeContainer) return;

  const activeItems = myPostings.filter(p => p.status === 'available' || p.status === 'claimed' || p.status === 'in_transit');
  const pastItems = myPostings.filter(p => p.status === 'delivered' || p.status === 'expired');

  if (activeItems.length === 0) {
    activeContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <p style="font-size: 1.1rem; color: #64748b; margin-bottom: 12px;">No active surplus listings right now.</p>
        <button class="btn btn-primary" onclick="document.getElementById('postFoodModal').classList.add('active')">+ Post Surplus Food Now</button>
      </div>
    `;
  } else {
    activeContainer.innerHTML = activeItems.map(item => createDonorListingCard(item)).join('');
  }

  if (pastContainer) {
    if (pastItems.length === 0) {
      pastContainer.innerHTML = '<p style="color: #64748b; padding: 20px;">No completed delivery history yet.</p>';
    } else {
      pastContainer.innerHTML = pastItems.map(item => createDonorListingCard(item, true)).join('');
    }
  }
}

// Create Card HTML
function createDonorListingCard(item, isPast = false) {
  const cd = calculateRemaining(item.safeUntil);
  const isUrgent = item.status === 'available' && cd.urgent;

  let stepperHtml = '';
  if (!isPast) {
    const steps = ['available', 'claimed', 'in_transit', 'delivered'];
    const curIdx = steps.indexOf(item.status);

    stepperHtml = `
      <div class="status-tracker">
        <div class="tracker-step ${curIdx >= 0 ? (curIdx === 0 ? 'active' : 'completed') : ''}">
          <div class="step-dot">1</div>
          <span>Available</span>
        </div>
        <div class="tracker-step ${curIdx >= 1 ? (curIdx === 1 ? 'active' : 'completed') : ''}">
          <div class="step-dot">2</div>
          <span>Claimed</span>
        </div>
        <div class="tracker-step ${curIdx >= 2 ? (curIdx === 2 ? 'active' : 'completed') : ''}">
          <div class="step-dot">3</div>
          <span>In Transit</span>
        </div>
        <div class="tracker-step ${curIdx >= 3 ? 'completed' : ''}">
          <div class="step-dot">4</div>
          <span>Delivered</span>
        </div>
      </div>
    `;
  }

  let ngoDetailsBox = '';
  if (item.claimedBy) {
    ngoDetailsBox = `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-top: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #1e40af; font-size: 0.9rem;">Claimed by: ${item.claimedBy.name}</strong>
          <span style="font-size: 0.75rem; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px;">NGO VERIFIED</span>
        </div>
        <div style="font-size: 0.82rem; color: #334155; line-height: 1.4;">
          ${item.volunteerDetails ? `
            <div><strong>Volunteer:</strong> ${item.volunteerDetails.volunteerName} (${item.volunteerDetails.volunteerPhone})</div>
            <div><strong>Vehicle:</strong> ${item.volunteerDetails.vehicleNumber}</div>
            <div><strong>ETA:</strong> ${item.volunteerDetails.estimatedPickupTime}</div>
          ` : 'Volunteer assignment pending.'}
        </div>
        <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          <span style="font-size: 0.8rem; font-weight: 600; color: #1e3a8a;">Handoff Verification OTP:</span>
          <span class="otp-pill">${item.pickupOtp}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="listing-card ${isUrgent ? 'urgent-border' : ''}">
      <div class="listing-img-wrap">
        <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'}" class="listing-img" alt="${item.foodTitle}">
        <div class="listing-badges">
          <span class="diet-badge diet-${item.dietaryType.toLowerCase()}">${item.dietaryType}</span>
          <span class="status-badge status-${item.status}">${item.status.replace('_', ' ')}</span>
        </div>
        <div class="countdown-badge ${isUrgent ? 'urgent' : ''}" data-safe-until="${item.safeUntil}">
          ⏱️ <span class="timer-display">${item.status === 'delivered' ? 'SAFELY DELIVERED' : cd.text}</span>
        </div>
      </div>

      <div class="listing-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
          <h3 class="listing-title">${item.foodTitle}</h3>
          <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
            ${item.listingCode}
          </span>
        </div>

        <div class="listing-meta">
          <span>🍲 ${item.foodType}</span>
          <span>📍 ${item.city}</span>
        </div>

        <div class="listing-qty-strip">
          <div class="qty-stat">
            <strong>${item.estimatedQuantityKg} kg</strong>
            <span>Quantity</span>
          </div>
          <div class="qty-stat">
            <strong>~${item.estimatedPlates}</strong>
            <span>Plates</span>
          </div>
          <div class="qty-stat">
            <strong>${item.storageCondition.split(' ')[0]}</strong>
            <span>Storage</span>
          </div>
        </div>

        <p class="listing-desc">${item.itemDescription}</p>

        ${stepperHtml}
        ${ngoDetailsBox}

        <div class="listing-footer">
          <span style="font-size: 0.78rem; color: #64748b;">
            Cooked: ${new Date(item.cookedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          ${item.status === 'available' ? `
            <button class="btn btn-outline btn-sm" onclick="cancelMyListing('${item._id}')" style="color: #ef4444; border-color: #fca5a5;">
              Cancel Listing
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// 1-second live countdown ticker
function refreshCountdowns() {
  const badges = document.querySelectorAll('.countdown-badge[data-safe-until]');
  badges.forEach(b => {
    const safeUntil = b.getAttribute('data-safe-until');
    const display = b.querySelector('.timer-display');
    if (!safeUntil || !display) return;

    const cd = calculateRemaining(safeUntil);
    display.textContent = cd.text;
    if (cd.urgent) b.classList.add('urgent');
    else b.classList.remove('urgent');
  });
}

// Validate Cooked Time (Strict 4-Hour Rule)
function validateCookedTime() {
  const cookedInput = document.getElementById('cookedTime');
  const feedback = document.getElementById('cookedTimeFeedback');
  const submitBtn = document.querySelector('#postSurplusForm button[type="submit"]');
  if (!cookedInput || !feedback) return true;

  if (!cookedInput.value) {
    feedback.textContent = '';
    return false;
  }

  const prepTime = new Date(cookedInput.value).getTime();
  const now = Date.now();
  const diffHours = (now - prepTime) / (3600 * 1000);

  if (diffHours < 0) {
    feedback.style.color = '#dc2626';
    feedback.innerHTML = '⚠️ Preparation time cannot be in the future.';
    if (submitBtn) submitBtn.disabled = true;
    return false;
  }

  if (diffHours > 4.0) {
    feedback.style.color = '#dc2626';
    feedback.innerHTML = `⚠️ <strong>Disallowed (>4 hours):</strong> Food was cooked ${diffHours.toFixed(1)} hours ago. Food older than 4 hours cannot be posted as per safety rules.`;
    if (submitBtn) submitBtn.disabled = true;
    return false;
  }

  const remainingMinutes = Math.floor((4.0 - diffHours) * 60);
  const remH = Math.floor(remainingMinutes / 60);
  const remM = remainingMinutes % 60;

  feedback.style.color = '#15803d';
  feedback.innerHTML = `✅ <strong>Eligible for Donation:</strong> Cooked ${diffHours.toFixed(1)}h ago. Safe consumption window remaining: <strong>${remH}h ${remM}m</strong>.`;
  if (submitBtn) submitBtn.disabled = false;
  return true;
}

// Handle Form Submission to Post Surplus Food
async function handlePostListing(e) {
  e.preventDefault();

  if (!validateCookedTime()) {
    showToast('Food cooked more than 4 hours ago cannot be posted for redistribution.', 'error');
    return;
  }

  const foodTitle = document.getElementById('foodTitle').value.trim();
  const foodType = document.getElementById('foodType').value;
  const dietaryType = document.getElementById('dietaryType').value;
  const estimatedQuantityKg = Number(document.getElementById('estimatedQuantityKg').value);
  const estimatedPlates = Number(document.getElementById('estimatedPlates').value);
  const cookedTime = document.getElementById('cookedTime').value;
  const storageCondition = document.getElementById('storageCondition').value;
  const itemDescription = document.getElementById('itemDescription').value.trim();
  const pickupAddress = document.getElementById('pickupAddress').value.trim();
  const contactPerson = document.getElementById('contactPerson').value.trim();
  const contactPhone = document.getElementById('contactPhone').value.trim();
  const imageUrl = document.getElementById('imageUrl').value.trim();
  const safetyChecklistAccepted = document.getElementById('safetyChecklistAccepted').checked;

  if (!safetyChecklistAccepted) {
    showToast('FSSAI Compliance: You must accept the hygienic handling checklist!', 'error');
    return;
  }

  const payload = {
    foodTitle,
    foodType,
    dietaryType,
    estimatedQuantityKg,
    estimatedPlates,
    cookedTime,
    safeHoursDuration: 4.0, // Fixed 4-Hour Rule
    storageCondition,
    itemDescription,
    pickupAddress,
    contactPerson,
    contactPhone,
    imageUrl,
    safetyChecklistAccepted: true
  };

  try {
    showToast('Publishing surplus food alert to verified NGOs...', 'info');
    const res = await apiRequest('/listings', 'POST', payload);
    if (res.success) {
      showToast(`Success! Batch ${res.listing.listingCode} is now live and broadcasted to NGOs in your city.`, 'success');
      document.getElementById('postSurplusForm').reset();
      document.getElementById('postFoodModal').classList.remove('active');
      await loadDonorPostings();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Cancel un-claimed listing
async function cancelMyListing(id) {
  if (!confirm('Are you sure you want to cancel this listing?')) return;
  try {
    const res = await apiRequest(`/listings/${id}/cancel`, 'PUT');
    showToast(res.message, 'info');
    await loadDonorPostings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Update KPI Stats Cards on Top of Donor Dashboard
function updateDonorStats() {
  const totalKg = myPostings.filter(p => p.status === 'delivered').reduce((acc, p) => acc + (p.estimatedQuantityKg || 0), 0);
  const activeCount = myPostings.filter(p => p.status === 'available' || p.status === 'claimed' || p.status === 'in_transit').length;
  const mealsCount = Math.round(totalKg * 2); // 1 kg = 2 to 3 meals

  const statActive = document.getElementById('donorActiveCount');
  const statKg = document.getElementById('donorTotalKg');
  const statMeals = document.getElementById('donorTotalMeals');

  if (statActive) statActive.textContent = activeCount;
  if (statKg) statKg.textContent = totalKg + ' kg';
  if (statMeals) statMeals.textContent = mealsCount;
}
