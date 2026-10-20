const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Auto-provision server/.env from .env.example if missing
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('⚡ [Auto-Setup] Automatically created server/.env from .env.example with pre-configured cloud database.');
  } catch (copyErr) {
    console.warn('Could not auto-copy .env file:', copyErr.message);
  }
}

dotenv.config({ path: envPath });

const express = require('express');
const cors = require('cors');

// Middleware Imports
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const foodPostRoutes = require('./routes/foodPostRoutes');
const ngoRoutes = require('./routes/ngoRoutes');
const collectionRequestRoutes = require('./routes/collectionRequestRoutes');
const foodRequestRoutes = require('./routes/foodRequestRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const foodReportRoutes = require('./routes/foodReportRoutes');
const servingLogRoutes = require('./routes/servingLogRoutes');
const pickupPointRoutes = require('./routes/pickupPointRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ngoStaffRoutes = require('./routes/ngoStaffRoutes');
const storyRoutes = require('./routes/storyRoutes');
const publicRoutes = require('./routes/publicRoutes');
const receiverAssistantRoutes = require('./routes/receiverAssistantRoutes');
const receiverCommerceRoutes = require('./routes/receiverCommerceRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();

// Behind a reverse proxy (e.g. Vercel, Nginx) set TRUST_PROXY so rate limits
// see each client's real IP instead of the proxy's.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}

// Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Fallback for locally uploaded images not present on this machine
app.use('/uploads', (req, res) => {
  res.redirect('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
});
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ShareMeal API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/food-posts', foodPostRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/collection-requests', collectionRequestRoutes);
app.use('/api/food-requests', foodRequestRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/reports', foodReportRoutes);
app.use('/api/food-reports', foodReportRoutes);
app.use('/api/serving-logs', servingLogRoutes);
app.use('/api/pickup-points', pickupPointRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ngo/staff', ngoStaffRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/help-assistant', receiverAssistantRoutes);
app.use('/api/receiver-assistant', receiverAssistantRoutes);
app.use('/api/receiver-commerce', receiverCommerceRoutes);
app.use('/api/wallet', walletRoutes);

// Serve Client Static Build on the same port (Unified Port Mode)
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

module.exports = app;
