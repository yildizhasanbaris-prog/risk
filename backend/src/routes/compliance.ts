import { Router } from 'express';
import { complianceAndChangeController } from '../controllers/complianceAndChange';

export const complianceRoutes = Router();

complianceRoutes.get('/findings', complianceAndChangeController.listFindings);
complianceRoutes.post('/findings', complianceAndChangeController.createFinding);
complianceRoutes.patch('/findings/:id/link', complianceAndChangeController.linkFinding);
