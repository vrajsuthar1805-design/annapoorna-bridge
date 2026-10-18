// Annapoorna Bridge Real-Time Socket.io Client

let socket = null;

function initSocketConnection() {
  if (typeof io === 'undefined') {
    console.warn('[Socket.io] Client library not loaded. Running in standard REST polling fallback.');
    return;
  }

  const socketUrl = window.location.origin;
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    // console.log('[Socket.io] Connected to Annapoorna Bridge Real-Time Network:', socket.id);

    // Register user room if logged in
    const user = Auth.getUser();
    if (user && user._id) {
      socket.emit('join:user', user._id);
      if (user.city) {
        socket.emit('join:city', user.city);
      }
      if (user.role === 'admin') {
        socket.emit('join:admin');
      }
    }
  });

  // Listen to new listings posted anywhere in the network
  socket.on('listing:created', (listing) => {
    // console.log('[Real-Time] New surplus food listing:', listing.listingCode);
    showToast(`🔔 New Surplus Food Alert: ${listing.foodTitle} (${listing.estimatedPlates} plates in ${listing.city})`, 'info');
    window.dispatchEvent(new CustomEvent('ab:listing_created', { detail: listing }));
  });

  // Listen to claims
  socket.on('listing:claimed', (claimData) => {
    // console.log('[Real-Time] Listing claimed:', claimData.listingCode);
    showToast(`🤝 Batch ${claimData.listingCode} was claimed by ${claimData.claimedBy.name}!`, 'success');
    window.dispatchEvent(new CustomEvent('ab:listing_claimed', { detail: claimData }));
  });

  // Listen to status updates (in_transit, delivered, expired)
  socket.on('listing:status_updated', (updateData) => {
    // console.log('[Real-Time] Status updated:', updateData.listingCode, updateData.status);
    window.dispatchEvent(new CustomEvent('ab:listing_status_updated', { detail: updateData }));
  });

  // Targeted user notifications (SMS/Email simulation push)
  socket.on('notification:new', (notif) => {
    showToast(`📩 ${notif.title}: ${notif.message}`, 'info');
    window.dispatchEvent(new CustomEvent('ab:user_notification', { detail: notif }));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSocketConnection();
});
