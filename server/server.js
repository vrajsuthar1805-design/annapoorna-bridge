require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB, closeDB } = require('./config/db');
const { initSocket } = require('./services/socketService');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database (with automatic fallback to MongoMemoryServer if needed)
    await connectDB();

    // Auto-seed if running fresh database (in-memory or first launch)
    try {
      const User = require('./models/User');
      const count = await User.countDocuments();
      if (count === 0) {
        console.log('[Startup] Empty database detected. Running automatic seed data...');
        const { seedData } = require('./seed');
        await seedData();
      }
    } catch (seedErr) {
      console.warn('[Startup] Auto-seed check note:', seedErr.message);
    }

    const server = http.createServer(app);

    // Initialize Socket.io with CORS support
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH'],
      },
    });

    initSocket(io);

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🌾 ANNAPOORNA BRIDGE SERVER RUNNING ON PORT ${PORT}`);
      console.log(`🌐 Application URL: http://localhost:${PORT}`);
      console.log(`🎯 UN SDG 2 (Zero Hunger) & SDG 11 (Sustainable Cities)`);
      console.log(`⚡ Real-Time Socket.io: Active`);
      console.log(`======================================================\n`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await closeDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Critical failure during startup:', error);
    process.exit(1);
  }
}

startServer();
