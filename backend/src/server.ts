import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import userRoutes from './routes/users.js';
import accountRoutes from './routes/accounts.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import csvRoutes from './routes/csv.js';
import intelligenceRoutes from './routes/intelligence.js';
import actionRoutes from './routes/actions.js';
import financialHealthRoutes from './routes/financialHealth.js';
import scenarioRoutes from './routes/scenarios.js';
import financialTimelineRoutes from './routes/financialTimeline.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
      }
      if (origin === env.FRONTEND_URL || origin === env.FRONTEND_URL.replace(/\/$/, '')) {
        return callback(null, true);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions/import/csv', csvRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/financial-health', financialHealthRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/financial-timeline', financialTimelineRoutes);

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 FINNEX Core Backend API Engine Running`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Port:        ${env.PORT}`);
  console.log(`Dev Auth:    ${env.DEV_AUTH_ENABLED ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Health URL:  http://localhost:${env.PORT}/api/health`);
  console.log(`==================================================`);
});

export default app;
