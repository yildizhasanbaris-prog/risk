import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard';
import { requireRole } from '../middleware/auth';

export const dashboardRoutes = Router();

dashboardRoutes.get('/stats', dashboardController.stats);
dashboardRoutes.get('/action-board', dashboardController.actionBoard);
dashboardRoutes.get('/registers', requireRole('SafetyOfficer', 'Manager', 'Admin'), dashboardController.registers);
dashboardRoutes.get('/srb-pack', requireRole('SafetyOfficer', 'Manager', 'Admin'), dashboardController.srbPack);
dashboardRoutes.get('/lessons-learned', dashboardController.listLessons);
dashboardRoutes.post('/lessons-learned', requireRole('SafetyOfficer', 'Manager', 'Admin'), dashboardController.promoteLesson);
