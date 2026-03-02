import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard';

export const dashboardRoutes = Router();

dashboardRoutes.get('/stats', dashboardController.stats);
