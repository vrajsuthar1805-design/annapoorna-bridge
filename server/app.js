// Express Application Setup

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('../backend/routes/authRoutes');
const listingRoutes = require('../backend/routes/listingRoutes');
const ngoRoutes = require('../backend/routes/ngoRoutes');
const adminRoutes = require('../backend/routes/adminRoutes');
const metricsRoutes = require('../backend/routes/metricsRoutes');
const errorHandler = require('../backend/middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Static Frontend Assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/metrics', metricsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'Annapoorna Bridge',
    mission: 'UN SDG 2 (Zero Hunger) & UN SDG 11 (Sustainable Cities)',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend SPA fallback for client pages
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Central Error Handler
app.use(errorHandler);

module.exports = app;
