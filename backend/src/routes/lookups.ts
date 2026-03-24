import { Router } from 'express';
import { lookupController } from '../controllers/lookups';

export const lookupRoutes = Router();

lookupRoutes.get('/severity', lookupController.severity);
lookupRoutes.get('/likelihood', lookupController.likelihood);
lookupRoutes.get('/risk-matrix', lookupController.riskMatrix);
lookupRoutes.get('/categories', lookupController.categories);
lookupRoutes.get('/departments', lookupController.departments);
lookupRoutes.get('/case-types', lookupController.caseTypes);
lookupRoutes.get('/risk-calculate', lookupController.riskCalculate);
