const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Annapoorna Bridge API',
    sdgMission: 'Zero Hunger (SDG 2) & Sustainable Communities (SDG 11)',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallback to SPA index.html for unmatched non-API routes (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
