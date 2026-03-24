import { Request, Response } from 'express';
import { PrismaClient, ActionStatus, ReportStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createSchema = z.object({
  description: z.string().min(1),
  ownerUserId: z.number(),
  dueDate: z.string().optional(),
  revisedDueDate: z.string().optional(),
  riskAssessmentId: z.number().optional(),
  supportDepartmentId: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  evidenceRef: z.string().optional(),
  escalation: z.string().optional(),
  verificationMethod: z.string().optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  ownerUserId: z.number().optional(),
  dueDate: z.string().optional(),
  revisedDueDate: z.string().optional(),
  supportDepartmentId: z.number().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  effectivenessComment: z.string().optional(),
  evidenceRef: z.string().optional(),
  escalation: z.string().optional(),
  verificationMethod: z.string().optional(),
  smsManagerSignOff: z.boolean().optional(),
});

export const actionController = {
  async list(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report ID' });

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const user = req.user!;
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        const canView = report.reportedByUserId === user.userId || (u?.departmentId && report.departmentId === u.departmentId);
        if (!canView) return res.status(403).json({ error: 'Access denied' });
      }

      const actions = await prisma.action.findMany({
        where: { reportId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          supportDept: { select: { id: true, code: true, name: true } },
        },
        orderBy: { actionNo: 'asc' },
      });
      return res.json(actions);
    } catch (err) {
      console.error('List actions error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report ID' });

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });

      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) return res.status(403).json({ error: 'Insufficient permissions' });

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const count = await prisma.action.count({ where: { reportId } });
      const action = await prisma.action.create({
        data: {
          reportId,
          actionNo: count + 1,
          description: parsed.data.description,
          ownerUserId: parsed.data.ownerUserId,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
          revisedDueDate: parsed.data.revisedDueDate ? new Date(parsed.data.revisedDueDate) : undefined,
          riskAssessmentId: parsed.data.riskAssessmentId,
          supportDepartmentId: parsed.data.supportDepartmentId,
          priority: parsed.data.priority,
          evidenceRef: parsed.data.evidenceRef,
          escalation: parsed.data.escalation,
          verificationMethod: parsed.data.verificationMethod,
        },
        include: { owner: { select: { id: true, name: true, email: true } } },
      });
      return res.status(201).json(action);
    } catch (err) {
      console.error('Create action error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const actionId = parseInt(req.params.actionId, 10);
      if (isNaN(reportId) || isNaN(actionId)) return res.status(400).json({ error: 'Invalid ID' });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });

      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) return res.status(403).json({ error: 'Insufficient permissions' });

      const existing = await prisma.action.findFirst({ where: { id: actionId, reportId } });
      if (!existing) return res.status(404).json({ error: 'Action not found' });

      const updateData: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.status === 'DONE') updateData.completedAt = new Date();
      if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
      if (parsed.data.revisedDueDate) updateData.revisedDueDate = new Date(parsed.data.revisedDueDate);

      const action = await prisma.action.update({
        where: { id: actionId },
        data: updateData,
        include: { owner: { select: { id: true, name: true, email: true } } },
      });

      const report = await prisma.report.findUnique({ where: { id: reportId }, include: { actions: true } });
      const inMitigation =
        report &&
        (report.status === ReportStatus.ACTION_IN_PROGRESS || report.status === ReportStatus.MITIGATION_IN_PROGRESS);
      if (inMitigation) {
        const actionsAfterUpdate = report.actions.map((a) => (a.id === actionId ? action : a));
        const allDone = actionsAfterUpdate.every((a) => a.status === ActionStatus.DONE);
        if (allDone) {
          await prisma.report.update({ where: { id: reportId }, data: { status: ReportStatus.PENDING_EFFECTIVENESS_CHECK } });
        }
      }

      return res.json(action);
    } catch (err) {
      console.error('Update action error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
