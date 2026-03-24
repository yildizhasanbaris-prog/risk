import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.number().int().positive(),
  departmentId: z.number().int().positive().nullable().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.number().int().positive().optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

const lookupSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
  name: z.string().optional(),
});

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

export const adminController = {
  // ─── Users ───

  async listUsers(_req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        include: { role: true, department: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roleId: u.roleId,
          roleName: u.role.name,
          departmentId: u.departmentId,
          departmentName: u.department?.name ?? null,
          isActive: u.isActive,
          createdAt: u.createdAt,
        })),
      );
    } catch (err) {
      console.error('listUsers error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });

      const { name, email, password, roleId, departmentId } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Bu e-posta adresi zaten kullanılıyor' });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, passwordHash, roleId, departmentId: departmentId ?? null },
        include: { role: true, department: true },
      });

      return res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
        isActive: user.isActive,
      });
    } catch (err) {
      console.error('createUser error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateUser(req: Request, res: Response) {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Geçersiz kullanıcı ID' });

      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });

      const data: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.email !== undefined) data.email = parsed.data.email;
      if (parsed.data.roleId !== undefined) data.roleId = parsed.data.roleId;
      if (parsed.data.departmentId !== undefined) data.departmentId = parsed.data.departmentId;
      if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
      if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10);

      const user = await prisma.user.update({
        where: { id },
        data,
        include: { role: true, department: true },
      });

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
        isActive: user.isActive,
      });
    } catch (err) {
      console.error('updateUser error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async listRoles(_req: Request, res: Response) {
    try {
      const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
      return res.json(roles);
    } catch (err) {
      console.error('listRoles error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // ─── Master Data CRUD ───

  async listEntity(req: Request, res: Response) {
    try {
      const { entity } = req.params;
      const data = await getEntityData(entity);
      if (!data) return res.status(400).json({ error: 'Geçersiz entity' });
      return res.json(data);
    } catch (err) {
      console.error('listEntity error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createEntity(req: Request, res: Response) {
    try {
      const { entity } = req.params;
      const parsed = lookupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });

      const record = await createEntityRecord(entity, parsed.data);
      if (!record) return res.status(400).json({ error: 'Geçersiz entity' });
      return res.status(201).json(record);
    } catch (err: any) {
      if (err?.code === 'P2002') return res.status(409).json({ error: 'Bu kod zaten mevcut' });
      console.error('createEntity error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateEntity(req: Request, res: Response) {
    try {
      const { entity } = req.params;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Geçersiz ID' });

      const record = await updateEntityRecord(entity, id, req.body);
      if (!record) return res.status(400).json({ error: 'Geçersiz entity' });
      return res.json(record);
    } catch (err: any) {
      if (err?.code === 'P2002') return res.status(409).json({ error: 'Bu kod zaten mevcut' });
      console.error('updateEntity error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

async function getEntityData(entity: string) {
  switch (entity) {
    case 'departments':
      return prisma.department.findMany({ orderBy: { code: 'asc' } });
    case 'categories':
      return prisma.category.findMany({ orderBy: { code: 'asc' } });
    case 'case-types':
      return prisma.caseType.findMany({ orderBy: { code: 'asc' } });
    case 'locations':
      return prisma.location.findMany({ orderBy: { code: 'asc' } });
    case 'action-types':
      return prisma.actionType.findMany({ orderBy: { code: 'asc' } });
    default:
      return null;
  }
}

async function createEntityRecord(entity: string, data: { code: string; description?: string; name?: string }) {
  switch (entity) {
    case 'departments':
      return prisma.department.create({ data: { code: data.code, name: data.name || data.description || data.code } });
    case 'categories':
      return prisma.category.create({ data: { code: data.code, description: data.description || data.code } });
    case 'case-types':
      return prisma.caseType.create({ data: { code: data.code, description: data.description || data.code } });
    case 'locations':
      return prisma.location.create({ data: { code: data.code, name: data.name || data.description || data.code } });
    case 'action-types':
      return prisma.actionType.create({ data: { code: data.code, description: data.description || data.code, isActive: true } });
    default:
      return null;
  }
}

async function updateEntityRecord(entity: string, id: number, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (body.code) data.code = body.code;

  switch (entity) {
    case 'departments':
      if (body.name) data.name = body.name;
      return prisma.department.update({ where: { id }, data });
    case 'categories':
      if (body.description) data.description = body.description;
      return prisma.category.update({ where: { id }, data });
    case 'case-types':
      if (body.description) data.description = body.description;
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
      return prisma.caseType.update({ where: { id }, data });
    case 'locations':
      if (body.name) data.name = body.name;
      return prisma.location.update({ where: { id }, data });
    case 'action-types':
      if (body.description) data.description = body.description;
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
      return prisma.actionType.update({ where: { id }, data });
    default:
      return null;
  }
}
