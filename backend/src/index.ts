import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { reportRoutes } from './routes/reports';
import { lookupRoutes } from './routes/lookups';
import { dashboardRoutes } from './routes/dashboard';
import { complianceRoutes } from './routes/compliance';
import { adminRoutes } from './routes/admin';
import { authMiddleware, requireRole } from './middleware/auth';
import { processNotificationQueue } from './services/notificationService';
import { prisma } from './lib/prisma';

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/lookups', authMiddleware, lookupRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/compliance', authMiddleware, complianceRoutes);
app.use('/api/admin', authMiddleware, requireRole('Admin', 'Manager'), adminRoutes);

const port = config.port;
app.listen(port, '0.0.0.0', () => {
  console.log(`Risk API running on port ${port}`);

  const NOTIFY_INTERVAL_MS = 60_000;
  setInterval(async () => {
    try {
      const count = await processNotificationQueue(prisma);
      if (count > 0) console.log(`Notifications processed: ${count}`);
    } catch (err) {
      console.error('Notification worker error:', err);
    }
  }, NOTIFY_INTERVAL_MS);
  console.log(`Notification worker started (every ${NOTIFY_INTERVAL_MS / 1000}s)`);
});
