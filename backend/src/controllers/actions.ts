import { Request, Response } from 'express';
import { z } from 'zod';
import { recalculateLifecycleForReport } from '../services/CaseLifecycleService';
import { enqueueNotification } from '../services/notificationService';
import { prisma } from '../lib/prisma';

const createSchema = z.object({
  title: z.string().optional(),
  description: z.string().min(1),
  ownerUserId: z.number(),
  dueDate: z.string().min(1, 'Hedef tarih zorunlu'),
  revisedDueDate: z.string().optional(),
  riskAssessmentId: z.number(),
  actionTypeId: z.number().optional(),
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
  status: z.enum(['PLANNED', 'OPEN', 'IN_PROGRESS', 'DONE', 'VERIFIED', 'CANCELLED']).optional(),
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
          actionType: { select: { id: true, code: true, description: true } },
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

      const ra = await prisma.riskAssessment.findFirst({
        where: { id: parsed.data.riskAssessmentId, reportId },
      });
      if (!ra) return res.status(400).json({ error: 'Geçersiz risk kalemi (riskAssessmentId)' });

      let actionTypeId = parsed.data.actionTypeId;
      if (actionTypeId == null) {
        const firstType = await prisma.actionType.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
        if (!firstType) {
          return res.status(400).json({ error: 'Sistemde tanımlı aksiyon tipi yok; seed veya yönetici eklemeli.' });
        }
        actionTypeId = firstType.id;
      }

      const count = await prisma.action.count({ where: { reportId } });
      const baseNo = report.reportNo ?? `CASE-${reportId}`;
      const mitigationDisplayNo = `${baseNo}-M${String(count + 1).padStart(2, '0')}`;
      const action = await prisma.action.create({
        data: {
          reportId,
          actionNo: count + 1,
          title: parsed.data.title,
          mitigationDisplayNo,
          linkedReportNo: report.reportNo ?? undefined,
          description: parsed.data.description,
          ownerUserId: parsed.data.ownerUserId,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
          revisedDueDate: parsed.data.revisedDueDate ? new Date(parsed.data.revisedDueDate) : undefined,
          riskAssessmentId: parsed.data.riskAssessmentId,
          actionTypeId,
          supportDepartmentId: parsed.data.supportDepartmentId,
          priority: parsed.data.priority,
          evidenceRef: parsed.data.evidenceRef,
          escalation: parsed.data.escalation,
          verificationMethod: parsed.data.verificationMethod,
        },
        include: { owner: { select: { id: true, name: true, email: true } } },
      });
      await recalculateLifecycleForReport(prisma, reportId);
      void enqueueNotification(prisma, 'MITIGATION_CREATED', {
        reportId,
        reportNo: report.reportNo ?? '',
        mitigationNo: action.mitigationDisplayNo ?? '',
        title: action.title ?? action.description.slice(0, 80),
        targetDate: action.dueDate?.toISOString() ?? '',
        currentStatus: action.status,
        confidential: report.confidential,
        directLink: `/reports/${reportId}/actions`,
      }).catch((e) => console.error('enqueue MITIGATION_CREATED', e));
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

      await recalculateLifecycleForReport(prisma, reportId);

      return res.json(action);
    } catch (err) {
      console.error('Update action error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
