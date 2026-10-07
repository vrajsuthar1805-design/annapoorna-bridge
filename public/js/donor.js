// ==========================================================
// ANNAPOORNA BRIDGE - Donor Module (Create & Track Postings)
// ==========================================================

function fillPreset(type) {
  const title = document.getElementById('postFoodTitle');
  const foodType = document.getElementById('postFoodType');
  const qtyVal = document.getElementById('postQuantityValue');
  const qtyUnit = document.getElementById('postQuantityUnit');
  const cookedTime = document.getElementById('postCookedTime');
  const safeHours = document.getElementById('postSafeWindowHours');
  const storage = document.getElementById('postStorageCondition');
  const instructions = document.getElementById('postInstructions');
  const photoUrl = document.getElementById('postPhotoUrl');
  const dietVeg = document.querySelector('input[name="postDietaryType"][value="veg"]');
  const dietNonVeg = document.querySelector('input[name="postDietaryType"][value="non-veg"]');

  // Format local ISO datetime for input
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const nowFormatted = now.toISOString().slice(0, 16);

  if (type === 'biryani') {
    title.value = 'Royal Hyderabadi Veg Biryani & Mirchi Ka Salan';
    foodType.value = 'Cooked Rice & Curry';
    if (dietVeg) dietVeg.checked = true;
    qtyVal.value = 160;
    qtyUnit.value = 'plates';
    cookedTime.value = nowFormatted;
    safeHours.value = '4';
    storage.value = 'Insulated / Hot Container (> 60°C)';
    instructions.value = 'Packed in 4 commercial food warmers at Banquet service bay.';
    photoUrl.value = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80';
  } else if (type === 'rotis') {
    title.value = 'Tawa Whole Wheat Rotis with Dal Tadka & Paneer Subzi';
    foodType.value = 'Breads & Rotis';
    if (dietVeg) dietVeg.checked = true;
    qtyVal.value = 220;
    qtyUnit.value = 'plates';
    cookedTime.value = nowFormatted;
    safeHours.value = '4';
    storage.value = 'Ambient / Room Temperature';
    instructions.value = 'Rotis wrapped in clean foil bundles of 25. Bring deep vessels for dal.';
    photoUrl.value = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80';
  } else if (type === 'sweets') {
    title.value = 'Fresh Milk Pedas & Kaju Katli (Celebration Surplus)';
    foodType.value = 'Sweets & Desserts';
    if (dietVeg) dietVeg.checked = true;
    qtyVal.value = 45;
    qtyUnit.value = 'kg';
    cookedTime.value = nowFormatted;
    safeHours.value = '6';
    storage.value = 'Ambient / Room Temperature';
    instructions.value = 'Pure ghee festival sweets in sterile trays.';
    photoUrl.value = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80';
  }

  showToast(`Autofilled template: ${title.value}`, 'info');
}

async function handleCreateListing(e) {
  e.preventDefault();

  const token = getToken();
  if (!token) {
    showToast('Please sign in as a food donor to post surplus food.', 'error');
    openModal('loginModal');
    return;
  }

  const user = getUser();
  if (user && user.role !== 'donor' && user.role !== 'admin') {
    showToast('Your account is registered as an NGO. Please switch or register a donor account to post food.', 'error');
    return;
  }

  const safetyCheck = document.getElementById('postSafetyCheck').checked;
  if (!safetyCheck) {
    showToast('You must accept the FSSAI Food Safety compliance checklist.', 'error');
    return;
  }

  const foodTitle = document.getElementById('postFoodTitle').value.trim();
  const foodType = document.getElementById('postFoodType').value;
  const dietaryType = document.querySelector('input[name="postDietaryType"]:checked').value;
  const quantityValue = document.getElementById('postQuantityValue').value;
  const quantityUnit = document.getElementById('postQuantityUnit').value;
  const cookedTime = document.getElementById('postCookedTime').value;
  const safeWindowHours = document.getElementById('postSafeWindowHours').value;
  const storageCondition = document.getElementById('postStorageCondition').value;
  const pickupAddress = document.getElementById('postAddress').value.trim();
  const pickupCity = document.getElementById('postCity').value;
  const contactPerson = document.getElementById('postContactPerson').value.trim();
  const contactPhone = document.getElementById('postContactPhone').value.trim();
  const specialInstructions = document.getElementById('postInstructions').value.trim();
  const photoUrl = document.getElementById('postPhotoUrl').value.trim();

  const submitBtn = document.getElementById('btnSubmitListing');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Publishing Listing...';

  try {
    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        foodTitle,
        foodType,
        dietaryType,
        quantityValue: Number(quantityValue),
        quantityUnit,
        cookedTime,
        safeWindowHours: Number(safeWindowHours),
        storageCondition,
        pickupAddress,
        pickupCity,
        contactPerson,
        contactPhone,
        specialInstructions,
        photoUrl,
        safetyChecklistAccepted: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to publish listing');
    }

    showToast('🎉 Food listing published live! Local verified NGOs alerted via SMS.', 'success');
    document.getElementById('createListingForm').reset();
    switchTab('donor-postings');
    fetchDonorListings();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i> Publish Surplus Listing Live (Broadcast Alert to NGOs)';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function fetchDonorListings() {
  const container = document.getElementById('donorListingsGrid');
  if (!container) return;

  const token = getToken();
  if (!token) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
        <i data-lucide="log-in" class="w-10 h-10 text-slate-400 mx-auto mb-2"></i>
        <h3 class="text-base font-bold text-slate-800">Please Sign In</h3>
        <p class="text-xs text-slate-500 mt-1">Sign in with your donor account to view and manage your postings.</p>
        <button onclick="openModal('loginModal')" class="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold">Sign In Now</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400">Loading your postings...</div>';

  try {
    const res = await fetch(`${API_BASE}/listings/my-listings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Error loading listings');

    if (!data.listings || data.listings.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <i data-lucide="package-open" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
          <h3 class="text-base font-bold text-slate-800">No Surplus Food Postings Yet</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Have extra meals after an event or kitchen service? Post a batch now to avoid food waste.</p>
          <button onclick="switchTab('post-food')" class="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i> Post First Listing
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = data.listings
      .map((item) => renderDonorListingCard(item))
      .join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-full py-6 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderDonorListingCard(item) {
  const isVeg = item.dietaryType === 'veg';
  const expiryTime = new Date(item.safeUntil).getTime();
  const isExpired = item.status === 'expired' || Date.now() > expiryTime;
  
  let statusBadge = '';
  if (item.status === 'available') {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 Available for Claim</span>`;
  } else if (item.status === 'claimed') {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">🤝 Claimed by NGO</span>`;
  } else if (item.status === 'in_transit') {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">🚚 In Transit</span>`;
  } else if (item.status === 'delivered') {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">✅ Safely Delivered</span>`;
  } else {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">⌛ Expired</span>`;
  }

  // Claimed NGO / Volunteer Card info
  let claimedInfoHtml = '';
  if (item.claimedBy) {
    claimedInfoHtml = `
      <div class="mt-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
        <div class="flex items-center justify-between text-blue-900 font-bold mb-1">
          <span>Relief Partner: ${item.claimedBy.orgName}</span>
          <span class="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">Verified NGO</span>
        </div>
        <div class="space-y-0.5 text-slate-700 text-[11px]">
          <div>Volunteer: <span class="font-semibold">${item.volunteerDetails.name}</span> (${item.volunteerDetails.phone})</div>
          <div>Vehicle: <span class="font-semibold">${item.volunteerDetails.vehicleNumber}</span></div>
          <div>ETA: <span class="font-semibold text-blue-700">~${item.volunteerDetails.etaMinutes} minutes</span></div>
        </div>

        <!-- Verification Handoff Code -->
        <div class="mt-2.5 pt-2 border-t border-blue-200/80 flex items-center justify-between">
          <span class="text-[10px] text-slate-600 font-medium">Safe Handover Code:</span>
          <span class="px-2 py-0.5 rounded bg-blue-900 text-white font-mono font-bold tracking-wider text-xs">
            ${item.pickupVerificationCode || 'PENDING'}
          </span>
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition">
      
      <!-- Card Image / Header -->
      <div class="relative h-44 bg-slate-100 overflow-hidden">
        <img src="${item.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'}" alt="${item.foodTitle}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        <div class="absolute top-3 left-3 flex items-center gap-2">
          <span class="diet-badge ${isVeg ? 'veg' : 'non-veg'} shadow-sm"><span class="dot"></span></span>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-black/60 text-white backdrop-blur">
            ${item.foodType}
          </span>
        </div>

        <div class="absolute top-3 right-3">
          ${statusBadge}
        </div>

        <div class="absolute bottom-3 left-3 right-3 text-white">
          <h3 class="font-bold text-base line-clamp-1">${item.foodTitle}</h3>
          <div class="flex items-center justify-between text-xs text-white/90 mt-0.5">
            <span class="font-semibold">${item.quantityValue} ${item.quantityUnit} (~${item.metrics ? item.metrics.estimatedMeals : item.quantityValue} meals)</span>
            <span>📍 ${item.pickupCity}</span>
          </div>
        </div>
      </div>

      <!-- Card Body -->
      <div class="p-4 flex-grow flex flex-col justify-between">
        
        <div class="space-y-2 text-xs text-slate-600">
          
          <!-- Countdown Gauge -->
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <i data-lucide="clock" class="w-4 h-4 text-amber-600"></i>
              <span class="text-slate-700 font-semibold">Safe Until:</span>
            </div>
            <span class="font-mono font-bold text-xs ${isExpired ? 'text-slate-400' : 'text-emerald-700'} countdown-display" data-expire="${item.safeUntil}">
              ${isExpired ? 'EXPIRED' : 'Calculating...'}
            </span>
          </div>

          <!-- Storage Details -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Storage condition:</span>
            <span class="font-medium text-slate-800">${item.storageCondition}</span>
          </div>

          <!-- Cooked timestamp -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Cooked at:</span>
            <span class="font-medium text-slate-800">${new Date(item.cookedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

        </div>

        <!-- Claim details if claimed -->
        ${claimedInfoHtml}

        <!-- Card Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Batch ID: #${item._id.slice(-6).toUpperCase()}</span>
          <span>${new Date(item.createdAt).toLocaleDateString()}</span>
        </div>

      </div>

    </div>
  `;
}

// Set default datetime on donor form load
document.addEventListener('DOMContentLoaded', () => {
  const cookedTimeInput = document.getElementById('postCookedTime');
  if (cookedTimeInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    cookedTimeInput.value = now.toISOString().slice(0, 16);
  }
});
