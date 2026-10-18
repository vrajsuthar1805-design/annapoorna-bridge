// Database Connection Handler with Hybrid MongoDB/Embedded Failover

const mongoose = require('mongoose');
const embeddedStore = require('../services/embeddedStore');

let isMongoConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/annapoorna_bridge';
  try {
    // Attempt Mongoose connection with 3-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    isMongoConnected = true;
    console.log(`[Database]  MongoDB connected successfully: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[Database]  MongoDB not detected at "${uri}" (${err.message})`);
    console.log('[Database] 🚀 Launching Embedded High-Speed Datastore with built-in Seed Data...');
    await embeddedStore.init();
    isMongoConnected = false;
    console.log('[Database]  Embedded Store initialized and ready for real-time operations!');
  }
};

const getDBMode = () => isMongoConnected ? 'mongodb' : 'embedded';

module.exports = {
  connectDB,
  getDBMode,
  isMongoConnected: () => isMongoConnected
};
