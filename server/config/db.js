const mongoose = require('mongoose');

let mongodInstance = null;

/**
 * Connect to MongoDB with connection reuse for serverless (Vercel)
 * and automatic fallback to MongoMemoryServer for local development.
 */
async function connectDB() {
  // 1. Reuse existing connection in serverless / lambda environments
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const isVercel = Boolean(process.env.VERCEL);
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/annapoorna_bridge';
  const autoMemory = !isVercel && process.env.USE_IN_MEMORY_DB !== 'false';

  // 2. Attempt connection to configured URI (e.g. MongoDB Atlas or local MongoDB)
  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isVercel ? 7000 : 2500,
    });
    console.log(`[Database] Successfully connected to MongoDB: ${mongoose.connection.host}`);
    return uri;
  } catch (err) {
    if (!autoMemory) {
      if (isVercel) {
        console.error('[Database] Vercel environment detected: Please set MONGODB_URI in Vercel Project Settings > Environment Variables.');
      }
      console.error('[Database] MongoDB connection failed:', err.message);
      throw err;
    }

    console.warn(`[Database] Could not connect to external MongoDB (${err.message}).`);
    console.log('[Database] Initializing isolated MongoMemoryServer for local zero-config runtime...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();

      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to In-Memory MongoDB at: ${memoryUri}`);
      return memoryUri;
    } catch (memErr) {
      console.error('[Database] Failed to start MongoMemoryServer:', memErr.message);
      throw memErr;
    }
  }
}

async function closeDB() {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('[Database] Database connection closed cleanly.');
  } catch (err) {
    console.error('[Database] Error closing database:', err.message);
  }
}

module.exports = { connectDB, closeDB };
