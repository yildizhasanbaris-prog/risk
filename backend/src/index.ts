import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { reportRoutes } from './routes/reports';
import { lookupRoutes } from './routes/lookups';
import { dashboardRoutes } from './routes/dashboard';
import { complianceRoutes } from './routes/compliance';
import { authMiddleware } from './middleware/auth';

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

const port = config.port;
app.listen(port, '0.0.0.0', () => {
  console.log(`Risk API running on port ${port}`);
});
