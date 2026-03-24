import { Router } from 'express';
import { adminController } from '../controllers/admin';

export const adminRoutes = Router();

// Users
adminRoutes.get('/users', adminController.listUsers);
adminRoutes.post('/users', adminController.createUser);
adminRoutes.put('/users/:id', adminController.updateUser);
adminRoutes.get('/roles', adminController.listRoles);

// Master Data
adminRoutes.get('/master/:entity', adminController.listEntity);
adminRoutes.post('/master/:entity', adminController.createEntity);
adminRoutes.put('/master/:entity/:id', adminController.updateEntity);
