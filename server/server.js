// Annapoorna Bridge Server Entrypoint (HTTP + Socket.io + Cron Sentinel)

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('../backend/config/db');
const { initNotifications } = require('../backend/services/notificationService');
const socketHandler = require('../backend/sockets/socketHandler');
const FoodListingModel = require('../backend/models/FoodListing');
const LogModel = require('../backend/models/Log');

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize real-time notification subsystem
initNotifications(io);
socketHandler(io);

// Background Sentinel: Auto-expires listings every 60 seconds
const startExpirySentinel = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      const listings = await FoodListingModel.find({ status: 'available' });
      for (const item of listings) {
        if (new Date(item.safeUntil) <= now) {
          await FoodListingModel.findByIdAndUpdate(item._id, { status: 'expired' });
          await LogModel.create({
            listingId: item._id,
            listingCode: item.listingCode,
            action: 'SENTINEL_AUTO_EXPIRED',
            fromStatus: 'available',
            toStatus: 'expired',
            actorRole: 'sentinel',
            actorName: 'Annapoorna Expiry Sentinel',
            note: 'Food exceeded safe consumption threshold.'
          });
          io.emit('listing:status_updated', {
            listingId: item._id,
            status: 'expired',
            listingCode: item.listingCode
          });
          console.log(`[Expiry Sentinel]  Listing ${item.listingCode} expired automatically.`);
        }
      }
    } catch (err) {
      // Background sentinel silent catch
    }
  }, 60000);
};

// Start Server
const start = async () => {
  await connectDB();
  startExpirySentinel();

  server.listen(PORT, () => {
    console.log(`
========================================================================
   ANNAPOORNA BRIDGE - ZERO HUNGER PLATFORM (UN SDG 2 & SDG 11)
========================================================================
  Web App URL     : http://localhost:${PORT}
  API Base        : http://localhost:${PORT}/api
  Socket.io       : ws://localhost:${PORT}
  Database Mode   : Dual (MongoDB + High-Speed Embedded Store)
------------------------------------------------------------------------
  DEMO CREDENTIALS FOR IMMEDIATE LOCAL TESTING:
  1. Donor (Grand Chola Banquet):
     Email: donor.chola@annapoornabridge.org  | Pass: Password123!
  2. NGO (Robin Hood Army Bangalore):
     Email: ngo.robinhood@annapoornabridge.org | Pass: Password123!
  3. NGO (Roti Bank Mumbai):
     Email: ngo.rotibank@annapoornabridge.org  | Pass: Password123!
  4. Platform Admin:
     Email: admin@annapoornabridge.org        | Pass: AdminPassword123!
========================================================================
`);
  });
};

start();
