// ==========================================================
// ANNAPOORNA BRIDGE - Real-Time Socket.io & Sound System
// ==========================================================

let socket = null;
let isAudioEnabled = true;

// Web Audio API Pleasant Notification Chime Generator
function playChime(type = 'default') {
  if (!isAudioEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'urgent') {
      // High two-tone alert
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Soft gentle chime (G4 -> C5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392.00, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (err) {
    // Audio context may require user interaction first
  }
}

function toggleAudio() {
  isAudioEnabled = !isAudioEnabled;
  const icon = document.getElementById('audioIcon');
  if (icon) {
    icon.setAttribute('data-lucide', isAudioEnabled ? 'volume-2' : 'volume-x');
    if (window.lucide) window.lucide.createIcons();
  }
  showToast(isAudioEnabled ? 'Notification sound enabled' : 'Notification sound muted', 'info');
}

function initSocketConnection() {
  if (typeof io === 'undefined') {
    console.warn('[Socket.io] Client library not loaded.');
    return;
  }

  try {
    socket = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
      timeout: 8000,
    });

    socket.on('connect_error', (err) => {
      console.log('[Socket.io] Real-time gateway status:', err.message);
    });
  } catch (err) {
    console.warn('[Socket.io] Initialization note:', err.message);
  }

  socket.on('connect', () => {
    console.log('[Socket.io] Connected to Annapoorna Bridge live server:', socket.id);
    const user = getUser();
    if (user) {
      window.joinUserRooms(user);
    }
  });

  // Event: New surplus food posted
  socket.on('listing:created', (listing) => {
    console.log('[Socket.io] New listing broadcast:', listing);
    playChime('urgent');
    showToast(`🚨 New Food Surplus: ${listing.foodTitle} in ${listing.pickupCity} (~${listing.quantityValue} ${listing.quantityUnit})`, 'info');
    
    // Refresh feeds if open
    if (window.fetchListings) window.fetchListings();
    if (window.loadAnalytics) window.loadAnalytics();
  });

  // Event: Listing claimed by NGO
  socket.on('listing:claimed', (listing) => {
    console.log('[Socket.io] Listing claimed:', listing);
    playChime('default');
    const ngoName = listing.claimedBy ? listing.claimedBy.orgName : 'an NGO';
    showToast(`🤝 Claimed! ${listing.foodTitle} was claimed by ${ngoName}`, 'success');

    if (window.fetchListings) window.fetchListings();
    if (window.fetchDonorListings) window.fetchDonorListings();
    if (window.fetchNgoClaims) window.fetchNgoClaims();
    if (window.loadAnalytics) window.loadAnalytics();
  });

  // Event: Listing status updated (in_transit, delivered)
  socket.on('listing:status_updated', (listing) => {
    console.log('[Socket.io] Listing status updated:', listing);
    playChime('default');
    const statusText = listing.status.replace('_', ' ').toUpperCase();
    showToast(`🚚 Food batch #${listing._id.slice(-6).toUpperCase()} is now ${statusText}`, 'info');

    if (window.fetchListings) window.fetchListings();
    if (window.fetchDonorListings) window.fetchDonorListings();
    if (window.fetchNgoClaims) window.fetchNgoClaims();
    if (window.loadAnalytics) window.loadAnalytics();
  });

  // Event: Simulated SMS / Email notification dispatch
  socket.on('notification:received', (notif) => {
    addNotificationToDrawer(notif);
  });
}

window.joinUserRooms = function (user) {
  if (!socket || !user) return;
  socket.emit('join:user', user._id || user.id);
  socket.emit('join:role', user.role);
  if (user.city) {
    socket.emit('join:city', user.city);
  }
};

function addNotificationToDrawer(notif) {
  const notifList = document.getElementById('notifList');
  const notifBadge = document.getElementById('notifBadge');
  const bellIcon = document.getElementById('bellIcon');

  if (notifBadge) notifBadge.classList.remove('hidden');
  if (bellIcon) {
    bellIcon.classList.add('bell-ring');
    setTimeout(() => bellIcon.classList.remove('bell-ring'), 1000);
  }

  if (notifList) {
    // If empty placeholder exists, clear it
    if (notifList.children.length === 1 && notifList.children[0].textContent.includes('No new alerts')) {
      notifList.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'p-2.5 hover:bg-slate-50 rounded-lg transition';
    const isSms = notif.type === 'SMS';
    item.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="inline-flex items-center gap-1 font-bold ${isSms ? 'text-blue-700' : 'text-emerald-700'}">
          ${isSms ? '📱 SMS Dispatch' : '✉️ Email Alert'}
        </span>
        <span class="text-[10px] text-slate-400">${new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="font-semibold text-slate-800 text-[11px]">${notif.subject}</div>
      <div class="text-slate-600 text-[11px] mt-0.5">${notif.message}</div>
      <div class="text-[10px] text-slate-400 mt-1">Recipient: ${notif.recipient}</div>
    `;
    notifList.prepend(item);
  }
}

function toggleNotifDrawer() {
  const drawer = document.getElementById('notifDrawer');
  const notifBadge = document.getElementById('notifBadge');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
  if (notifBadge) {
    notifBadge.classList.add('hidden'); // Clear unread dot when opened
  }
}

function clearNotifs() {
  const notifList = document.getElementById('notifList');
  if (notifList) {
    notifList.innerHTML = '<div class="p-4 text-center text-slate-400">No new alerts yet</div>';
  }
}

// Close notif drawer when clicking outside
document.addEventListener('click', (e) => {
  const drawer = document.getElementById('notifDrawer');
  const btn = document.getElementById('notifBellBtn');
  if (drawer && !drawer.classList.contains('hidden')) {
    if (!drawer.contains(e.target) && !btn.contains(e.target)) {
      drawer.classList.add('hidden');
    }
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initSocketConnection();
});
