import { Router } from 'express';
import { lookupController } from '../controllers/lookups';

export const lookupRoutes = Router();

lookupRoutes.get('/severity', lookupController.severity);
lookupRoutes.get('/likelihood', lookupController.likelihood);
lookupRoutes.get('/risk-matrix', lookupController.riskMatrix);
lookupRoutes.get('/categories', lookupController.categories);
lookupRoutes.get('/departments', lookupController.departments);
lookupRoutes.get('/case-types', lookupController.caseTypes);
lookupRoutes.get('/locations', lookupController.locations);
lookupRoutes.get('/action-types', lookupController.actionTypes);
lookupRoutes.get('/approval-routes', lookupController.approvalRoutes);
lookupRoutes.get('/risk-acceptance-rules', lookupController.riskAcceptanceRules);
lookupRoutes.get('/hf-taxonomy', lookupController.hfTaxonomy);
lookupRoutes.get('/record-retention-rules', lookupController.recordRetentionRules);
lookupRoutes.get('/confidentiality-rules', lookupController.confidentialityRules);
lookupRoutes.get('/users', lookupController.users);
lookupRoutes.get('/risk-calculate', lookupController.riskCalculate);
