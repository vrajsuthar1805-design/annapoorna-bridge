// Annapoorna Bridge NGO Portal Controller (Real-Time Feed, Atomic Claims, Dispatch Slips, Transit Tracking)

let allFeedListings = [];
let myClaimedMissions = [];
let currentClaimTargetId = null;
let ngoCountdownTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getUser();
  if (!user || (user.role !== 'ngo' && user.role !== 'admin')) {
    showToast('Please log in with an NGO account to access the NGO Surplus Food Relief Feed.', 'error');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return;
  }

  // Populate NGO Details in Header
  document.getElementById('ngoOrgName').textContent = user.name;
  document.getElementById('ngoCity').textContent = user.city;
  if (user.ngoDetails && user.ngoDetails.darpanId) {
    document.getElementById('ngoDarpanBadge').textContent = `Darpan ID: ${user.ngoDetails.darpanId}`;
  }

  // Set city filter to NGO's city by default if available
  const citySelect = document.getElementById('filterCity');
  if (citySelect && user.city) {
    citySelect.value = user.city;
  }

  // Attach filter change listeners
  document.getElementById('filterCity')?.addEventListener('change', loadSurplusFeed);
  document.getElementById('filterDietary')?.addEventListener('change', loadSurplusFeed);
  document.getElementById('filterUrgentOnly')?.addEventListener('change', loadSurplusFeed);

  // Claim form submission
  document.getElementById('claimForm')?.addEventListener('submit', handleClaimSubmit);

  // Load feed and active claimed missions
  await loadSurplusFeed();
  await loadMyClaimedMissions();

  // Start countdown ticker
  if (ngoCountdownTimer) clearInterval(ngoCountdownTimer);
  ngoCountdownTimer = setInterval(updateFeedCountdowns, 1000);

  // Socket.io Real-time event listeners
  window.addEventListener('ab:listing_created', (e) => {
    // Flash live notification banner
    const alertBanner = document.getElementById('newAlertBanner');
    if (alertBanner) {
      alertBanner.style.display = 'block';
      alertBanner.textContent = `⚡ Live Alert: ${e.detail.foodTitle} in ${e.detail.city} (${e.detail.estimatedPlates} plates) just posted!`;
      setTimeout(() => alertBanner.style.display = 'none', 10000);
    }
    loadSurplusFeed();
  });

  window.addEventListener('ab:listing_claimed', (e) => {
    loadSurplusFeed();
    loadMyClaimedMissions();
  });

  window.addEventListener('ab:listing_status_updated', (e) => {
    loadSurplusFeed();
    loadMyClaimedMissions();
  });
});

// Load Surplus Feed from Backend
async function loadSurplusFeed() {
  const city = document.getElementById('filterCity')?.value || 'all';
  const dietaryType = document.getElementById('filterDietary')?.value || 'all';
  const urgentOnly = document.getElementById('filterUrgentOnly')?.checked ? 'true' : 'false';

  const params = new URLSearchParams({ status: 'available', city, dietaryType, urgentOnly });

  try {
    const res = await apiRequest(`/listings?${params.toString()}`);
    if (res.success) {
      allFeedListings = res.listings;
      renderSurplusFeed();
      updateAvailableStat();
    }
  } catch (err) {
    showToast('Failed to load surplus feed: ' + err.message, 'error');
  }
}

// Render Available Listings Grid
function renderSurplusFeed() {
  const grid = document.getElementById('ngoFeedGrid');
  if (!grid) return;

  if (allFeedListings.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <span style="font-size: 2.2rem;">✨</span>
        <h3 style="margin-top: 10px; color: #1e293b;">No available surplus food matching current filters.</h3>
        <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">Connected in real-time. New listings from marriage halls & event venues will appear automatically!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = allFeedListings.map(item => {
    const cd = calculateRemaining(item.safeUntil);
    const isUrgent = cd.urgent;

    return `
      <div class="listing-card ${isUrgent ? 'urgent-border' : ''}">
        <div class="listing-img-wrap">
          <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'}" class="listing-img" alt="${item.foodTitle}">
          <div class="listing-badges">
            <span class="diet-badge diet-${item.dietaryType.toLowerCase()}">${item.dietaryType}</span>
            ${isUrgent ? '<span class="status-badge" style="background: #ef4444; color: #fff; font-weight: 800;">CRITICAL URGENT</span>' : ''}
          </div>
          <div class="countdown-badge ${isUrgent ? 'urgent' : ''}" data-safe-until="${item.safeUntil}">
            ⏱️ <span class="timer-display">${cd.text}</span>
          </div>
        </div>

        <div class="listing-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <h3 class="listing-title">${item.foodTitle}</h3>
            <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
              ${item.listingCode}
            </span>
          </div>

          <div class="listing-meta">
            <span>📍 ${item.city}</span>
            <span>🏛️ ${item.donorName}</span>
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
              <span>Condition</span>
            </div>
          </div>

          <p class="listing-desc">${item.itemDescription}</p>

          <div style="background: #f8fafc; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #475569; margin-bottom: 14px;">
            <div><strong>Pickup:</strong> ${item.pickupAddress}</div>
            <div><strong>Contact:</strong> ${item.contactPerson} (${item.contactPhone})</div>
          </div>

          <div class="listing-footer">
            <span style="font-size: 0.8rem; color: #166534; font-weight: 600;">
              🛡️ 4-Hour Freshness Rule
            </span>
            ${cd.expired ? `
              <button class="btn btn-sm" disabled style="background: #94a3b8; color: #fff; cursor: not-allowed;">
                Expired (&gt;4 Hours) - Cannot Accept
              </button>
            ` : `
              <button class="btn btn-primary" onclick="openClaimModal('${item._id}', '${item.listingCode}', '${item.foodTitle.replace(/'/g, "\\'")}', '${item.estimatedQuantityKg}', '${item.estimatedPlates}', ${cd.expired})">
                Claim &amp; Dispatch 🚚
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Open Claim & Volunteer Assignment Modal
function openClaimModal(id, code, title, kg, plates, isExpired = false) {
  if (isExpired) {
    showToast('This food request cannot be accepted. The food was cooked more than 4 hours ago and has expired under the 4-hour freshness rule.', 'error');
    return;
  }
  currentClaimTargetId = id;
  document.getElementById('claimBatchCode').textContent = code;
  document.getElementById('claimFoodTitle').textContent = `${title} (${kg} kg / ~${plates} plates)`;

  // Pre-fill volunteer with sample data for quick convenience
  const volName = document.getElementById('claimVolunteerName');
  const volPhone = document.getElementById('claimVolunteerPhone');
  const volVehicle = document.getElementById('claimVehicleNumber');
  const volEta = document.getElementById('claimEta');

  if (volName && !volName.value) volName.value = 'Ramesh Volunteer';
  if (volPhone && !volPhone.value) volPhone.value = '+91 98451 22334';
  if (volVehicle && !volVehicle.value) volVehicle.value = 'Insulated Relief Van';
  if (volEta && !volEta.value) volEta.value = 'Within 30 minutes';

  document.getElementById('claimModal').classList.add('active');
}

function closeClaimModal() {
  document.getElementById('claimModal').classList.remove('active');
  currentClaimTargetId = null;
}

// Handle Atomic Claim Submission
async function handleClaimSubmit(e) {
  e.preventDefault();
  if (!currentClaimTargetId) return;

  const volunteerName = document.getElementById('claimVolunteerName').value.trim();
  const volunteerPhone = document.getElementById('claimVolunteerPhone').value.trim();
  const vehicleNumber = document.getElementById('claimVehicleNumber').value.trim();
  const estimatedPickupTime = document.getElementById('claimEta').value.trim();

  const payload = {
    volunteerName,
    volunteerPhone,
    vehicleNumber,
    estimatedPickupTime
  };

  try {
    showToast('Reserving food batch with atomic lock...', 'info');
    const res = await apiRequest(`/ngo/claim/${currentClaimTargetId}`, 'POST', payload);

    if (res.success) {
      showToast(`🎉 Batch successfully claimed! Dispatch slip generated.`, 'success');
      closeClaimModal();
      await loadSurplusFeed();
      await loadMyClaimedMissions();
      // Automatically open digital dispatch slip
      openDispatchSlip(res.listing._id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load NGO's Claimed Missions (In-Progress & Delivered)
async function loadMyClaimedMissions() {
  try {
    const res = await apiRequest('/ngo/claimed');
    if (res.success) {
      myClaimedMissions = res.listings;
      renderClaimedMissions();
      updateMissionsStat();
    }
  } catch (err) {
    console.warn('Could not load claimed missions:', err.message);
  }
}

// Render Claimed Missions
function renderClaimedMissions() {
  const container = document.getElementById('claimedMissionsGrid');
  if (!container) return;

  if (myClaimedMissions.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <p style="color: #64748b;">No active rescue missions claimed yet. Browse the Live Feed to claim surplus food.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = myClaimedMissions.map(item => {
    return `
      <div class="listing-card">
        <div class="listing-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <span class="status-badge status-${item.status}">${item.status.replace('_', ' ')}</span>
              <h3 class="listing-title" style="margin-top: 6px;">${item.foodTitle}</h3>
            </div>
            <span style="font-weight: 700; font-size: 0.8rem; color: #1e3a8a; background: #dbeafe; padding: 4px 8px; border-radius: 4px;">
              ${item.listingCode}
            </span>
          </div>

          <div style="font-size: 0.85rem; color: #475569; margin-bottom: 12px;">
            <div>📍 <strong>Venue:</strong> ${item.pickupAddress}</div>
            <div>📞 <strong>Contact:</strong> ${item.contactPerson} (${item.contactPhone})</div>
            <div>🍱 <strong>Quantity:</strong> ${item.estimatedQuantityKg} kg (~${item.estimatedPlates} plates)</div>
            ${item.volunteerDetails ? `
              <div>🚚 <strong>Volunteer:</strong> ${item.volunteerDetails.volunteerName} (${item.volunteerDetails.volunteerPhone}) - ${item.volunteerDetails.vehicleNumber}</div>
            ` : ''}
          </div>

          <div style="background: #f1f5f9; border-radius: 6px; padding: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: 600;">Handoff OTP:</span>
            <span class="otp-pill">${item.pickupOtp}</span>
          </div>

          <!-- Transit Controls -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="openDispatchSlip('${item._id}')">
              📄 View / Print Slip
            </button>

            ${item.status === 'claimed' ? `
              <button class="btn btn-secondary btn-sm" onclick="updateMissionStatus('${item._id}', 'in_transit')">
                🚚 Mark In Transit
              </button>
            ` : ''}

            ${item.status === 'in_transit' ? `
              <button class="btn btn-primary btn-sm" onclick="updateMissionStatus('${item._id}', 'delivered')">
                ✅ Mark Delivered (Beneficiaries Fed)
              </button>
            ` : ''}

            ${item.status === 'delivered' ? `
              <span style="font-size: 0.85rem; color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                🎉 Successfully Delivered!
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update Mission Transit Status
async function updateMissionStatus(id, newStatus) {
  const note = prompt(`Enter transit notes (e.g., "Picked up from venue" or "Delivered to Slum Community Center"):`, '');
  try {
    showToast(`Updating status to ${newStatus.replace('_', ' ')}...`, 'info');
    const res = await apiRequest(`/ngo/status/${id}`, 'PUT', { status: newStatus, note });
    if (res.success) {
      showToast(res.message, 'success');
      await loadMyClaimedMissions();
      await loadSurplusFeed();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open Digital Pickup Dispatch Slip Modal
async function openDispatchSlip(id) {
  try {
    const res = await apiRequest(`/ngo/dispatch-slip/${id}`);
    if (!res.success) throw new Error(res.message);

    const s = res.dispatchSlip;
    const modalContent = document.getElementById('dispatchSlipContent');

    modalContent.innerHTML = `
      <div class="dispatch-slip">
        <div class="slip-header">
          <div>
            <h2 style="color: #15803d; font-size: 1.4rem; font-weight: 800;">Annapoorna Bridge</h2>
            <div style="font-size: 0.85rem; color: #475569;">OFFICIAL SURPLUS FOOD PICKUP DISPATCH SLIP</div>
            <div style="font-size: 0.75rem; color: #64748b;">UN SDG 2 (Zero Hunger) Relief Network</div>
          </div>
          <div class="slip-qr-mock">
            <div>
              <strong>QR VERIFIED</strong><br>
              <span style="font-size: 0.6rem;">${s.listing.code}</span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 0.85rem;">
          <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">DONOR VENUE</strong>
            <div><strong>Venue:</strong> ${s.donor.venueName}</div>
            <div><strong>Address:</strong> ${s.donor.address} (${s.donor.city})</div>
            <div><strong>Contact:</strong> ${s.donor.contactPerson} (${s.donor.phone})</div>
            <div><strong>License:</strong> ${s.donor.license}</div>
          </div>
          <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">CLAIMING NGO</strong>
            <div><strong>Organization:</strong> ${s.ngo.organizationName}</div>
            <div><strong>Darpan ID:</strong> ${s.ngo.darpanId}</div>
            <div><strong>Volunteer:</strong> ${s.volunteer.volunteerName} (${s.volunteer.volunteerPhone})</div>
            <div><strong>Vehicle:</strong> ${s.volunteer.vehicleNumber}</div>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 6px;">
            <strong>Item: ${s.listing.title}</strong>
            <span style="color: #15803d; font-weight: 700;">${s.listing.quantityKg} kg (~${s.listing.plates} plates)</span>
          </div>
          <div style="font-size: 0.82rem; color: #64748b;">
            Dietary: <strong>${s.listing.dietary}</strong> | Category: <strong>${s.listing.category}</strong> | Storage: <strong>${s.listing.storageCondition}</strong>
          </div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin-bottom: 16px; font-size: 0.8rem; color: #166534;">
          <strong>FSSAI Safety Rules:</strong> ${s.fssaiGuidelinesSummary[0]} Keep transport covered and clean.
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #eff6ff; padding: 12px; border-radius: 6px;">
          <span style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">Donor Handoff Verification OTP:</span>
          <span class="otp-pill">${s.pickupOtp}</span>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
          <div>Generated At: ${new Date(s.generatedAt).toLocaleString()}</div>
          <div>Slip No: ${s.slipNumber}</div>
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;" class="no-print">
        <button class="btn btn-outline" onclick="document.getElementById('dispatchSlipModal').classList.remove('active')">Close</button>
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print Dispatch Slip</button>
      </div>
    `;

    document.getElementById('dispatchSlipModal').classList.add('active');
  } catch (err) {
    showToast('Failed to generate dispatch slip: ' + err.message, 'error');
  }
}

// 1-second Countdown updater on feed cards
function updateFeedCountdowns() {
  const badges = document.querySelectorAll('#ngoFeedGrid .countdown-badge[data-safe-until]');
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

// Statistics Counters in Header
function updateAvailableStat() {
  const countEl = document.getElementById('ngoAvailableCount');
  if (countEl) countEl.textContent = allFeedListings.length;
}

function updateMissionsStat() {
  const activeMissions = myClaimedMissions.filter(m => m.status === 'claimed' || m.status === 'in_transit').length;
  const countEl = document.getElementById('ngoActiveMissionsCount');
  if (countEl) countEl.textContent = activeMissions;
}
