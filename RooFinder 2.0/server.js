require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const { getAppUrl } = require('./utils/app-url');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 4000;
const rootDir = __dirname;
const APP_URL = getAppUrl();
const LOCAL_ORIGINS = new Set([
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === 'null') {
      return callback(null, true);
    }

    if (origin === APP_URL || LOCAL_ORIGINS.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RootFinder API',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard.html'));
});

app.get('/reset-password.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'reset-password.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(rootDir, 'reset-password.html'));
});

app.get('/auth.js', (req, res) => {
  res.sendFile(path.join(rootDir, 'auth.js'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

async function start() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   ROOTFINDER - Backend API v1.0      ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`[BOOT] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[BOOT] APP_URL=${APP_URL}`);
  console.log(`[BOOT] DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'missing'}`);
  console.log(`[BOOT] JWT_SECRET=${process.env.JWT_SECRET ? 'set' : 'missing'}`);
  console.log(`[BOOT] BREVO_API_KEY=${process.env.BREVO_API_KEY ? 'set' : 'missing'}`);

  await initDB();

  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
    console.log(`[SERVER] API available at http://localhost:${PORT}/api`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health\n`);
  });
}

if (require.main === module) {
  start().catch(err => {
    console.error('[SERVER] Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
