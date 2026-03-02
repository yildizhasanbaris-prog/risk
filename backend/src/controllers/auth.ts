import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid email or password', details: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true, department: true },
      });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const payload = {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
      };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          department: user.department?.name ?? null,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async me(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { role: true, department: true },
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
          role: { select: { name: true } },
          department: { select: { code: true, name: true } },
        },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        departmentId: user.departmentId,
        department: user.department,
      });
    } catch (err) {
      console.error('Me error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
