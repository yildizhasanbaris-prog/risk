import { Router } from 'express';
import { riskAssessmentController } from '../controllers/riskAssessments';

export const riskAssessmentRoutes = Router({ mergeParams: true });

riskAssessmentRoutes.get('/', riskAssessmentController.list);
riskAssessmentRoutes.post('/', riskAssessmentController.create);
riskAssessmentRoutes.put('/:assessmentId', riskAssessmentController.update);
