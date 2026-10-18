// Notification Service with Real-Time Socket.io and Simulated SMS/Email Stubs

let ioInstance = null;
const notificationsQueue = [];

const initNotifications = (io) => {
  ioInstance = io;
};

const sendNotification = async ({ type, recipient, title, message, data = {} }) => {
  const timestamp = new Date().toISOString();
  const notifObj = {
    id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    recipientId: recipient._id || recipient.id || recipient,
    title,
    message,
    data,
    timestamp,
    read: false
  };

  notificationsQueue.unshift(notifObj);
  if (notificationsQueue.length > 200) notificationsQueue.pop();

  // 1. Socket.io Real-Time Emit
  if (ioInstance) {
    if (recipient._id || recipient.id) {
      ioInstance.to(`user:${recipient._id || recipient.id}`).emit('notification:new', notifObj);
    }
  }

  // 2. Simulated SMS Gateway Dispatch Log
  if (recipient.phone) {
    console.log(`\x1b[36m[SMS-GATEWAY]\x1b[0m 📱 Sent to ${recipient.phone} (${recipient.name || 'User'}): "${title}: ${message}"`);
  }

  // 3. Simulated Email Dispatch Log
  if (recipient.email) {
    console.log(`\x1b[35m[EMAIL-DISPATCH]\x1b[0m 📧 Sent to ${recipient.email}: Subject: "[Annapoorna Bridge] ${title}" | ${message}`);
  }

  return notifObj;
};

const broadcastListingEvent = (eventName, payload) => {
  if (!ioInstance) return;

  // Broadcast to global feed
  ioInstance.emit(eventName, payload);

  // Broadcast to city-specific room if available
  if (payload.city) {
    ioInstance.to(`city:${payload.city}`).emit(eventName, payload);
  }
};

const getRecentNotifications = (userId) => {
  if (!userId) return notificationsQueue.slice(0, 30);
  return notificationsQueue.filter(n => n.recipientId === userId).slice(0, 30);
};

module.exports = {
  initNotifications,
  sendNotification,
  broadcastListingEvent,
  getRecentNotifications,
  getIO: () => ioInstance
};
