// ==========================================================
// ANNAPOORNA BRIDGE - NGO Module (Claiming & Dispatch Slips)
// ==========================================================

function openClaimModal(listingId, foodTitle, quantity) {
  const token = getToken();
  if (!token) {
    showToast('Please sign in as an NGO to claim surplus food batches.', 'error');
    openModal('loginModal');
    return;
  }

  const user = getUser();
  if (user && user.role !== 'ngo' && user.role !== 'admin') {
    showToast('Only verified NGOs can claim surplus food. Please log in with an NGO account.', 'error');
    return;
  }

  document.getElementById('claimListingId').value = listingId;
  document.getElementById('claimFoodTitlePreview').textContent = foodTitle;
  document.getElementById('claimQuantityPreview').textContent = `Quantity: ${quantity}`;

  // Prefill volunteer with NGO user info if available
  const volNameInput = document.getElementById('claimVolunteerName');
  const volPhoneInput = document.getElementById('claimVolunteerPhone');
  if (volNameInput && !volNameInput.value) {
    volNameInput.value = `${user.name} (Relief Lead)`;
  }
  if (volPhoneInput && !volPhoneInput.value) {
    volPhoneInput.value = user.phone || '';
  }

  openModal('claimModal');
}

async function submitClaim(e) {
  e.preventDefault();

  const token = getToken();
  const listingId = document.getElementById('claimListingId').value;
  const volunteerName = document.getElementById('claimVolunteerName').value.trim();
  const volunteerPhone = document.getElementById('claimVolunteerPhone').value.trim();
  const vehicleNumber = document.getElementById('claimVehicle').value.trim();
  const etaMinutes = document.getElementById('claimEtaMinutes').value;

  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        volunteerName,
        volunteerPhone,
        vehicleNumber,
        etaMinutes: Number(etaMinutes),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to claim listing');
    }

    closeModal('claimModal');
    showToast('🎉 Food batch successfully claimed! Generating dispatch slip...', 'success');

    // Display the generated pickup dispatch slip
    renderDispatchSlip(data.dispatchSlip || {
      foodTitle: data.listing.foodTitle,
      quantity: `${data.listing.quantityValue} ${data.listing.quantityUnit}`,
      pickupAddress: data.listing.pickupAddress,
      pickupCity: data.listing.pickupCity,
      contactPerson: data.listing.contactPerson,
      contactPhone: data.listing.contactPhone,
      donorOrg: data.listing.donorId ? data.listing.donorId.orgName : 'Venue Donor',
      ngoOrg: data.listing.claimedBy ? data.listing.claimedBy.orgName : 'Relief NGO',
      volunteer: data.listing.volunteerDetails,
      verificationCode: data.listing.pickupVerificationCode,
      claimedAt: data.listing.claimedAt,
    });

    openModal('dispatchSlipModal');
    fetchNgoClaims();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchNgoClaims() {
  const container = document.getElementById('ngoClaimsGrid');
  if (!container) return;

  const token = getToken();
  if (!token) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
        <i data-lucide="log-in" class="w-10 h-10 text-slate-400 mx-auto mb-2"></i>
        <h3 class="text-base font-bold text-slate-800">Please Sign In</h3>
        <p class="text-xs text-slate-500 mt-1">Sign in with an NGO account to access claimed food batches & logistics.</p>
        <button onclick="openModal('loginModal')" class="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold">Sign In as NGO</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400">Loading active claims...</div>';

  try {
    const res = await fetch(`${API_BASE}/listings/my-claims`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Error loading claims');

    if (!data.listings || data.listings.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <i data-lucide="truck" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
          <h3 class="text-base font-bold text-slate-800">No Active Relief Claims</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Explore the live food alert feed to claim surplus meals from banquets, hostels and hotels near you.</p>
          <button onclick="switchTab('feed')" class="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
            <i data-lucide="compass" class="w-4 h-4"></i> View Surplus Food Feed
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = data.listings
      .map((item) => renderNgoClaimCard(item))
      .join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-full py-6 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderNgoClaimCard(item) {
  const isVeg = item.dietaryType === 'veg';
  const expiryTime = new Date(item.safeUntil).getTime();
  const isExpired = Date.now() > expiryTime;

  let actionButtons = '';
  if (item.status === 'claimed') {
    actionButtons = `
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button onclick="updateClaimStatus('${item._id}', 'in_transit')" class="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition">
          <i data-lucide="truck" class="w-3.5 h-3.5"></i> Mark In Transit
        </button>
        <button onclick="viewSlipById('${item._id}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 transition">
          <i data-lucide="file-text" class="w-3.5 h-3.5"></i> View Slip
        </button>
      </div>
    `;
  } else if (item.status === 'in_transit') {
    actionButtons = `
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button onclick="promptDeliveryCompletion('${item._id}')" class="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition">
          <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Confirm Delivered
        </button>
        <button onclick="viewSlipById('${item._id}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 transition">
          <i data-lucide="file-text" class="w-3.5 h-3.5"></i> View Slip
        </button>
      </div>
    `;
  } else if (item.status === 'delivered') {
    actionButtons = `
      <div class="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
        <span class="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
          <i data-lucide="award" class="w-4 h-4 text-emerald-600"></i> Distributed to Beneficiaries
        </span>
        <p class="text-[10px] text-emerald-700 mt-0.5">Delivered at: ${item.deliveredAt ? new Date(item.deliveredAt).toLocaleTimeString() : 'Recorded'}</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition">
      
      <!-- Card Image -->
      <div class="relative h-40 bg-slate-100 overflow-hidden">
        <img src="${item.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'}" alt="${item.foodTitle}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

        <div class="absolute top-3 left-3 flex items-center gap-2">
          <span class="diet-badge ${isVeg ? 'veg' : 'non-veg'} shadow-sm"><span class="dot"></span></span>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-black/60 text-white backdrop-blur">
            ${item.foodType}
          </span>
        </div>

        <div class="absolute top-3 right-3">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 uppercase">
            ${item.status.replace('_', ' ')}
          </span>
        </div>

        <div class="absolute bottom-3 left-3 right-3 text-white">
          <h3 class="font-bold text-base line-clamp-1">${item.foodTitle}</h3>
          <div class="text-xs text-white/90">
            ${item.quantityValue} ${item.quantityUnit} • 📍 ${item.pickupCity}
          </div>
        </div>
      </div>

      <!-- Card Content -->
      <div class="p-4 flex-grow flex flex-col justify-between text-xs">
        
        <div class="space-y-2">
          <!-- Donor Info -->
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <div class="font-bold text-slate-800 text-xs">${item.donorId ? item.donorId.orgName : 'Donor Venue'}</div>
            <div class="text-[11px] text-slate-600 mt-0.5">${item.pickupAddress}</div>
            <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Contact: ${item.contactPerson}</span>
              <a href="tel:${item.contactPhone}" class="text-emerald-700 font-bold hover:underline">📞 ${item.contactPhone}</a>
            </div>
          </div>

          <!-- Volunteer Assigned -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-[11px]">
            <span class="text-blue-900 font-medium">Volunteer: ${item.volunteerDetails.name}</span>
            <span class="font-mono font-bold text-blue-800 bg-white px-1.5 py-0.5 rounded border border-blue-200">
              Pass: ${item.pickupVerificationCode}
            </span>
          </div>

          <!-- Countdown -->
          <div class="flex items-center justify-between text-[11px] text-slate-500">
            <span>Safe Consumption:</span>
            <span class="font-mono font-bold countdown-display ${isExpired ? 'text-red-500' : 'text-emerald-700'}" data-expire="${item.safeUntil}">
              ${isExpired ? 'EXPIRED' : 'Calculating...'}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        ${actionButtons}

      </div>

    </div>
  `;
}

async function updateClaimStatus(listingId, status) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Status update failed');

    showToast(`Status updated to ${status.replace('_', ' ').toUpperCase()}`, 'success');
    fetchNgoClaims();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function promptDeliveryCompletion(listingId) {
  const notes = prompt('Enter delivery notes / distribution details (e.g., "Served 150 meals to Shelter A"):', 'Successfully distributed to beneficiaries in hygienic condition.');
  if (notes === null) return; // User cancelled

  const token = getToken();
  fetch(`${API_BASE}/listings/${listingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'delivered',
      deliveryNotes: notes,
    }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (d.success) {
        showToast('🍱 Mission Completed! Food safely distributed.', 'success');
        fetchNgoClaims();
        if (window.loadAnalytics) window.loadAnalytics();
      } else {
        showToast(d.message, 'error');
      }
    })
    .catch((err) => showToast(err.message, 'error'));
}

async function viewSlipById(listingId) {
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}`);
    const data = await res.json();
    if (data.listing) {
      renderDispatchSlip({
        slipId: `SLIP-${data.listing._id.slice(-6).toUpperCase()}`,
        foodTitle: data.listing.foodTitle,
        quantity: `${data.listing.quantityValue} ${data.listing.quantityUnit}`,
        dietaryType: data.listing.dietaryType,
        pickupAddress: data.listing.pickupAddress,
        pickupCity: data.listing.pickupCity,
        contactPerson: data.listing.contactPerson,
        contactPhone: data.listing.contactPhone,
        donorOrg: data.listing.donorId ? data.listing.donorId.orgName : 'Donor Venue',
        ngoOrg: data.listing.claimedBy ? data.listing.claimedBy.orgName : 'Relief NGO',
        volunteer: data.listing.volunteerDetails,
        verificationCode: data.listing.pickupVerificationCode,
        claimedAt: data.listing.claimedAt,
      });
      openModal('dispatchSlipModal');
    }
  } catch (e) {
    showToast('Failed to load dispatch slip', 'error');
  }
}

function renderDispatchSlip(slip) {
  const container = document.getElementById('dispatchSlipContent');
  if (!container) return;

  container.innerHTML = `
    <!-- Slip Printable Design -->
    <div class="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white space-y-4">
      
      <!-- Slip Header -->
      <div class="flex items-start justify-between border-b pb-3 border-slate-200">
        <div>
          <span class="text-emerald-800 font-black text-lg tracking-tight block">ANNAPOORNA BRIDGE</span>
          <span class="text-[10px] text-amber-700 uppercase font-semibold">Surplus Food Emergency Dispatch Slip</span>
        </div>
        <div class="text-right">
          <span class="text-xs font-mono font-bold text-slate-500">${slip.slipId || 'DISPATCH SLIP'}</span>
          <span class="block text-[10px] text-slate-400">${new Date(slip.claimedAt || Date.now()).toLocaleString()}</span>
        </div>
      </div>

      <!-- Verification Code Box -->
      <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-center">
        <span class="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">Pickup Handover Verification Code</span>
        <span class="text-2xl font-mono font-black text-amber-900 tracking-widest block mt-0.5">${slip.verificationCode}</span>
        <span class="text-[10px] text-amber-700 block mt-0.5">Show this code to venue security / chef before loading food vessels.</span>
      </div>

      <!-- Food & Logistics Grid -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="p-2.5 bg-slate-50 rounded-lg">
          <span class="text-[10px] text-slate-500 uppercase font-bold block">Surplus Food Description</span>
          <span class="font-bold text-slate-800 block mt-0.5">${slip.foodTitle}</span>
          <span class="text-emerald-700 font-semibold text-[11px] block mt-0.5">Quantity: ${slip.quantity}</span>
        </div>

        <div class="p-2.5 bg-slate-50 rounded-lg">
          <span class="text-[10px] text-slate-500 uppercase font-bold block">Authorized NGO Partner</span>
          <span class="font-bold text-blue-900 block mt-0.5">${slip.ngoOrg}</span>
          <span class="text-slate-600 text-[11px] block mt-0.5">Volunteer: ${slip.volunteer ? slip.volunteer.name : 'Relief Team'}</span>
        </div>
      </div>

      <!-- Pickup Venue Address -->
      <div class="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
        <span class="text-[10px] text-slate-500 uppercase font-bold block">Pickup Venue Address</span>
        <div class="font-bold text-slate-900">${slip.donorOrg}</div>
        <div class="text-slate-600">${slip.pickupAddress}, ${slip.pickupCity}</div>
        <div class="text-slate-700 font-semibold pt-1">
          Contact: ${slip.contactPerson} • 📞 ${slip.contactPhone}
        </div>
      </div>

      <!-- Transport Details -->
      <div class="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-500 uppercase font-bold">Vehicle Number</span>
          <div class="font-mono font-bold text-slate-800">${slip.volunteer ? slip.volunteer.vehicleNumber : 'Designated Vehicle'}</div>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-500 uppercase font-bold">Dispatched ETA</span>
          <div class="font-bold text-blue-700">${slip.volunteer ? slip.volunteer.etaMinutes : '30'} Minutes</div>
        </div>
      </div>

      <!-- Statutory Checklist -->
      <div class="border-t pt-3 border-slate-200 text-[10px] text-slate-500 space-y-1">
        <div class="font-bold text-slate-700">FSSAI Transport Compliance Reminders:</div>
        <div>✓ Maintain hot food &gt;60°C or chill rapidly &lt;5°C during transport.</div>
        <div>✓ Check food containers are sealed with food-grade lids prior to departure.</div>
        <div>✓ Food must reach intended community beneficiaries within safe window.</div>
      </div>

    </div>
  `;
}
