import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard';

export const dashboardRoutes = Router();

dashboardRoutes.get('/stats', dashboardController.stats);
dashboardRoutes.get('/srb-pack', dashboardController.srbPack);
dashboardRoutes.get('/lessons-learned', dashboardController.listLessons);
dashboardRoutes.post('/lessons-learned', dashboardController.promoteLesson);
