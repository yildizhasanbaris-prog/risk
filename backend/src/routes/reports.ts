import { Router } from 'express';
import { reportController } from '../controllers/reports';
import { riskAssessmentRoutes } from './riskAssessments';
import { actionRoutes } from './actions';
import { attachmentRoutes } from './attachments';

export const reportRoutes = Router();

reportRoutes.get('/', reportController.list);
reportRoutes.get('/export/excel', reportController.exportExcel);
reportRoutes.use('/:id/risk-assessments', riskAssessmentRoutes);
reportRoutes.use('/:id/actions', actionRoutes);
reportRoutes.use('/:id/attachments', attachmentRoutes);
reportRoutes.post('/', reportController.create);
reportRoutes.get('/:id/allowed-statuses', reportController.getAllowedStatuses);
reportRoutes.get('/:id', reportController.getById);
reportRoutes.put('/:id', reportController.update);
reportRoutes.post('/:id/status', reportController.updateStatus);
reportRoutes.put('/:id/review', reportController.review);
