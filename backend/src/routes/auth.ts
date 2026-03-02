import { Router } from 'express';
import { authController } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

export const authRoutes = Router();

authRoutes.post('/login', authController.login);
authRoutes.get('/me', authMiddleware, authController.me);
