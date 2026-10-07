const { emitEvent } = require('./socketService');

// In-memory store for recent notifications (for live UI notification bell / feed)
const notificationHistory = [];
const MAX_HISTORY = 50;

/**
 * Record and broadcast an alert (simulated or real)
 */
function recordNotification({ type, recipient, subject, message, meta = {} }) {
  const notification = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type, // 'SMS' | 'EMAIL' | 'SYSTEM'
    recipient,
    subject,
    message,
    meta,
    timestamp: new Date(),
  };

  notificationHistory.unshift(notification);
  if (notificationHistory.length > MAX_HISTORY) {
    notificationHistory.pop();
  }

  // Visual server console logging formatted for realism
  const icon = type === 'SMS' ? '📱 [SMS DISPATCH]' : '✉️  [EMAIL ALERT]';
  console.log(`\n================== ${icon} ==================`);
  console.log(`To:      ${recipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log(`Time:    ${notification.timestamp.toLocaleTimeString()}`);
  console.log(`====================================================\n`);

  // Broadcast to frontend client(s) via WebSocket
  if (meta.userId) {
    emitEvent('notification:received', notification, `user:${meta.userId}`);
  }
  if (meta.role) {
    emitEvent('notification:received', notification, `role:${meta.role}`);
  }
  emitEvent('notification:received', notification); // Global broadcast for demo visibility

  return notification;
}

/**
 * Trigger alerts on listing creation
 */
async function notifyNewListing(listing, donor) {
  // Alert NGOs in that city
  recordNotification({
    type: 'SMS',
    recipient: `Verified NGOs in ${listing.pickupCity}`,
    subject: `🚨 Urgent Food Surplus Alert - ${listing.pickupCity}`,
    message: `New surplus food posted by ${donor.orgName}: ${listing.foodTitle} (~${listing.quantityValue} ${listing.quantityUnit}). Safe until: ${new Date(listing.safeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Claim now on Annapoorna Bridge!`,
    meta: {
      listingId: listing._id,
      city: listing.pickupCity,
      role: 'ngo',
    },
  });

  recordNotification({
    type: 'EMAIL',
    recipient: donor.email,
    subject: `Listing Confirmed: ${listing.foodTitle}`,
    message: `Hello ${donor.name}, your surplus food listing #${listing._id.toString().slice(-6).toUpperCase()} is now live on Annapoorna Bridge. Local verified NGOs have been notified. Please keep the food packed as per FSSAI safety norms.`,
    meta: {
      listingId: listing._id,
      userId: donor._id,
    },
  });
}

/**
 * Trigger alerts when an NGO claims food
 */
async function notifyListingClaimed(listing, donor, ngo) {
  // Alert donor
  recordNotification({
    type: 'SMS',
    recipient: donor.phone,
    subject: `Food Claimed by ${ngo.orgName}!`,
    message: `Great news! ${ngo.orgName} has claimed your food listing "${listing.foodTitle}". Volunteer: ${listing.volunteerDetails.name} (${listing.volunteerDetails.phone}) ETA: ~${listing.volunteerDetails.etaMinutes} mins. Verification Code: ${listing.pickupVerificationCode}.`,
    meta: {
      listingId: listing._id,
      userId: donor._id,
    },
  });

  // Confirmation to NGO
  recordNotification({
    type: 'SMS',
    recipient: ngo.phone,
    subject: `Pickup Confirmed - Dispatch Slip Generated`,
    message: `You claimed "${listing.foodTitle}" at ${donor.orgName}. Address: ${listing.pickupAddress}, Contact: ${listing.contactPerson} (${listing.contactPhone}). Verification Code: ${listing.pickupVerificationCode}.`,
    meta: {
      listingId: listing._id,
      userId: ngo._id,
    },
  });
}

/**
 * Trigger alerts on status progression
 */
async function notifyStatusUpdate(listing, donor, ngo, newStatus) {
  let donorMsg = '';
  let ngoMsg = '';

  if (newStatus === 'in_transit') {
    donorMsg = `Volunteer ${listing.volunteerDetails.name} has picked up the food from ${donor.orgName} and is now in transit to the distribution center. Thank you for zero food waste!`;
    ngoMsg = `Batch #${listing._id.toString().slice(-6).toUpperCase()} is marked In Transit. Vehicle: ${listing.volunteerDetails.vehicleNumber}. Ensure food is maintained under safe temperature guidelines.`;
  } else if (newStatus === 'delivered') {
    donorMsg = `Success! Your surplus food donation (${listing.quantityValue} ${listing.quantityUnit}) has been safely distributed to beneficiaries by ${ngo ? ngo.orgName : 'the NGO'}. You helped save lives and diverted CO₂ emissions!`;
    ngoMsg = `Mission complete! Batch #${listing._id.toString().slice(-6).toUpperCase()} marked Delivered. Verification log recorded on UN SDG ledger.`;
  }

  if (donor && donorMsg) {
    recordNotification({
      type: 'SMS',
      recipient: donor.phone,
      subject: `Status Update: ${newStatus.toUpperCase().replace('_', ' ')}`,
      message: donorMsg,
      meta: { listingId: listing._id, userId: donor._id },
    });
  }

  if (ngo && ngoMsg) {
    recordNotification({
      type: 'SMS',
      recipient: ngo.phone,
      subject: `Status Update: ${newStatus.toUpperCase().replace('_', ' ')}`,
      message: ngoMsg,
      meta: { listingId: listing._id, userId: ngo._id },
    });
  }
}

function getRecentNotifications(limit = 20) {
  return notificationHistory.slice(0, limit);
}

module.exports = {
  recordNotification,
  notifyNewListing,
  notifyListingClaimed,
  notifyStatusUpdate,
  getRecentNotifications,
};
