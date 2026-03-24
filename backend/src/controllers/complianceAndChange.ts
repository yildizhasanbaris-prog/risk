import { Request, Response } from 'express';
import { PrismaClient, ChangeCaseStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const findingSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  safetyImpact: z.boolean().optional(),
  linkedReportId: z.number().optional(),
  description: z.string().optional(),
});

const changeSchema = z.object({
  changeType: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(ChangeCaseStatus).optional(),
  transitionalRiskNote: z.string().optional(),
});

export const complianceAndChangeController = {
  async listFindings(_req: Request, res: Response) {
    const items = await prisma.complianceFinding.findMany({ orderBy: { code: 'asc' } });
    return res.json(items);
  },

  async createFinding(req: Request, res: Response) {
    if (!['SafetyOfficer', 'Manager', 'Admin'].includes(req.user!.roleName)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const parsed = findingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const f = await prisma.complianceFinding.create({ data: parsed.data });
    return res.status(201).json(f);
  },

  async linkFinding(req: Request, res: Response) {
    if (!['SafetyOfficer', 'Manager', 'Admin'].includes(req.user!.roleName)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const id = parseInt(req.params.id, 10);
    const parsed = z.object({ linkedReportId: z.number().nullable() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error' });
    const f = await prisma.complianceFinding.update({
      where: { id },
      data: { linkedReportId: parsed.data.linkedReportId },
    });
    return res.json(f);
  },

  async getChange(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    const c = await prisma.changeRecord.findUnique({ where: { reportId } });
    return res.json(c);
  },

  async upsertChange(req: Request, res: Response) {
    if (!['SafetyOfficer', 'Manager', 'Admin'].includes(req.user!.roleName)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const reportId = parseInt(req.params.id, 10);
    const parsed = changeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const c = await prisma.changeRecord.upsert({
      where: { reportId },
      create: { reportId, ...parsed.data },
      update: parsed.data,
    });
    return res.json(c);
  },
};
