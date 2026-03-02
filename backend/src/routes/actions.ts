import { Router } from 'express';
import { actionController } from '../controllers/actions';

export const actionRoutes = Router({ mergeParams: true });

actionRoutes.get('/', actionController.list);
actionRoutes.post('/', actionController.create);
actionRoutes.put('/:actionId', actionController.update);
