import { Request, Response } from 'express';
import { ChangeCaseStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

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

function isStaff(user: { roleName: string }) {
  return ['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName);
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export const complianceAndChangeController = {
  async listFindings(_req: Request, res: Response) {
    try {
      const items = await prisma.complianceFinding.findMany({ orderBy: { code: 'asc' } });
      return res.json(items);
    } catch (err) {
      console.error('listFindings error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createFinding(req: Request, res: Response) {
    try {
      if (!isStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const parsed = findingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const f = await prisma.complianceFinding.create({ data: parsed.data });
      return res.status(201).json(f);
    } catch (err) {
      console.error('createFinding error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async linkFinding(req: Request, res: Response) {
    try {
      if (!isStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = z.object({ linkedReportId: z.number().nullable() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error' });
      const f = await prisma.complianceFinding.update({
        where: { id },
        data: { linkedReportId: parsed.data.linkedReportId },
      });
      return res.json(f);
    } catch (err) {
      console.error('linkFinding error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getChange(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const c = await prisma.changeRecord.findUnique({ where: { reportId } });
      return res.json(c);
    } catch (err) {
      console.error('getChange error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async upsertChange(req: Request, res: Response) {
    try {
      if (!isStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = changeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const c = await prisma.changeRecord.upsert({
        where: { reportId },
        create: { reportId, ...parsed.data },
        update: parsed.data,
      });
      return res.json(c);
    } catch (err) {
      console.error('upsertChange error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
