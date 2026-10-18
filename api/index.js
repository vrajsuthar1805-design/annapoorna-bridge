// Vercel Serverless Function Entry Point for Annapoorna Bridge
const app = require('../server/app');
const { connectDB } = require('../backend/config/db');

let isDbInitialized = false;

module.exports = async (req, res) => {
  if (!isDbInitialized) {
    try {
      await connectDB();
    } catch (e) {
      console.warn('[Vercel Serverless] DB connection note:', e.message);
    }
    isDbInitialized = true;
  }
  return app(req, res);
};
