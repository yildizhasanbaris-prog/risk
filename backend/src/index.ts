import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { reportRoutes } from './routes/reports';
import { lookupRoutes } from './routes/lookups';
import { dashboardRoutes } from './routes/dashboard';
import { authMiddleware } from './middleware/auth';

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (config.corsOrigin === true || !origin) return cb(null, true);
    const list = config.corsOrigin as string[];
    const hasLocalhost = list.some((o) => o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1'));
    const isLocalhost = origin?.startsWith('http://localhost') || origin?.startsWith('http://127.0.0.1');
    const allowed =
      list.includes(origin || '') ||
      (origin?.endsWith('.vercel.app') ?? false) ||
      (hasLocalhost && isLocalhost);
    cb(null, allowed ? (origin ?? true) : false);
  },
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

app.listen(config.port, () => {
  console.log(`Risk API running on http://localhost:${config.port}`);
});
