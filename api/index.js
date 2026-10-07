const app = require('../server/app');
const { connectDB } = require('../server/config/db');
const User = require('../server/models/User');

let isSeeded = false;

module.exports = async (req, res) => {
  try {
    await connectDB();

    // Auto-seed if running on a fresh MongoDB Atlas database
    if (!isSeeded) {
      const count = await User.countDocuments();
      if (count === 0) {
        console.log('[Vercel Serverless] Seeding initial data on fresh database...');
        const { seedData } = require('../server/seed');
        await seedData();
      }
      isSeeded = true;
    }
  } catch (err) {
    console.error('[Vercel Serverless] DB connection error:', err.message);
  }

  return app(req, res);
};
