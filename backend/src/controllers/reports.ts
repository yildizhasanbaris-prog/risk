import { Request, Response } from 'express';
import {
  ReportStatus,
  MorStatus,
  MandatoryVoluntary,
  OccurrenceClassification,
  CaseLifecycleStatus,
} from '@prisma/client';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { canTransition, getAllowedTransitions } from '../services/StatusWorkflowService';
import {
  deriveLifecycle,
  lifecycleLabels,
  recalculateLifecycleForReport,
  validateCaseClosure,
} from '../services/CaseLifecycleService';
import { enqueueNotification } from '../services/notificationService';
import { writeAuditLog } from '../services/auditService';
import { prisma } from '../lib/prisma';

const createReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  departmentId: z.number().optional(),
  caseTypeId: z.number().optional(),
  location: z.string().optional(),
  aircraftReg: z.string().optional(),
  aircraftType: z.string().optional(),
  componentPn: z.string().optional(),
  componentSn: z.string().optional(),
  workOrderRef: z.string().optional(),
  taskRef: z.string().optional(),
  customerRef: z.string().optional(),
  subcontractorRef: z.string().optional(),
  eventDate: z.union([z.string(), z.date()]).optional(),
  immediateActions: z.string().optional(),
  personsInformed: z.string().optional(),
  categoryId: z.number().optional(),
  confidential: z.boolean().optional(),
  anonymous: z.boolean().optional(),
  linkedCaseId: z.number().optional(),
});

const updateReportSchema = createReportSchema.partial();

const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  comment: z.string().optional(),
});

const updateLifecycleSchema = z.object({
  lifecycleStatus: z.nativeEnum(CaseLifecycleStatus),
});

const reviewUpdateSchema = z.object({
  isSafetyRelated: z.boolean().optional(),
  isMor: z.boolean().optional(),
  morDeadline: z.union([z.string(), z.date()]).optional(),
  morStatus: z.enum(['NONE', 'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED']).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  comment: z.string().optional(),
  closureSummary: z.string().optional(),
  caseTypeId: z.number().optional().nullable(),
  mandatoryVoluntary: z.nativeEnum(MandatoryVoluntary).optional().nullable(),
  occurrenceClassification: z.nativeEnum(OccurrenceClassification).optional().nullable(),
  immediateContainmentRequired: z.boolean().optional().nullable(),
  investigationRequired: z.boolean().optional().nullable(),
  riskAssessmentRequired: z.boolean().optional().nullable(),
  externalReportingRequired: z.boolean().optional().nullable(),
  screeningComment: z.string().optional().nullable(),
});

async function generateReportNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SMS-${year}-`;
  const last = await prisma.report.findFirst({
    where: { reportNo: { startsWith: prefix } },
    orderBy: { reportNo: 'desc' },
  });
  const nextNum = last ? parseInt(last.reportNo!.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export const reportController = {
  async list(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { status, departmentId, from, to, limit = '50', offset = '0' } = req.query;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (departmentId) where.departmentId = Number(departmentId);
      if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as Record<string, Date>).gte = new Date(from as string);
        if (to) (where.createdAt as Record<string, Date>).lte = new Date(to as string);
      }

      // Reporter sees only own + own department
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        where.OR = [
          { reportedByUserId: user.userId },
          ...(u?.departmentId ? [{ departmentId: u.departmentId }] : []),
        ];
      }

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          include: {
            reportedBy: { select: { id: true, name: true, email: true } },
            department: { select: { code: true, name: true } },
            category: { select: { code: true, description: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.min(parseInt(limit as string, 10) || 50, 100),
          skip: parseInt(offset as string, 10) || 0,
        }),
        prisma.report.count({ where }),
      ]);

      return res.json({ data: reports, total });
    } catch (err) {
      console.error('List reports error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const parsed = createReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }
      const reportNo = await generateReportNo();
      const report = await prisma.report.create({
        data: {
          ...parsed.data,
          reportNo,
          reportedByUserId: req.user!.userId,
          status: ReportStatus.NEW,
          lifecycleStatus: CaseLifecycleStatus.OPEN,
          safetyCaseKind: 'REPORT',
        },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
        },
      });
      void enqueueNotification(prisma, 'CASE_CREATED', {
        reportId: report.id,
        reportNo: report.reportNo ?? '',
        title: report.title,
        confidential: report.confidential,
        caseType: 'REPORT',
        department: report.departmentId != null ? String(report.departmentId) : '',
        location: report.location ?? '',
        riskLevel: report.currentRiskLevel ?? '',
        currentStatus: report.status,
        directLink: `/reports/${report.id}`,
      }).catch((e) => console.error('enqueue CASE_CREATED', e));
      return res.status(201).json(report);
    } catch (err) {
      console.error('Create report error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const user = req.user!;
      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, code: true, description: true } },
          caseType: { select: { id: true, code: true, description: true } },
          screenedBy: { select: { id: true, name: true } },
          hazards: { orderBy: { sortOrder: 'asc' } },
          investigation: true,
          effectivenessReview: true,
          approvals: { include: { signedBy: { select: { id: true, name: true } } }, orderBy: { id: 'asc' }, take: 30 },
          comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' }, take: 50 },
          riskAssessments: { include: { assessedBy: { select: { id: true, name: true } }, hazard: true } },
          actions: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
              supportDept: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      // Reporter: only own or same department
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        const canView =
          report.reportedByUserId === user.userId ||
          (u?.departmentId && report.departmentId === u.departmentId);
        if (!canView) return res.status(403).json({ error: 'Access denied' });
      }

      const resolvedLifecycle =
        report.lifecycleStatus ??
        deriveLifecycle({
          reportStatus: report.status,
          actions: report.actions.map((a) => ({ status: a.status })),
          effectiveness: report.effectivenessReview,
        });

      const payload = { ...report, lifecycleStatus: resolvedLifecycle, lifecycleLabel: lifecycleLabels[resolvedLifecycle] } as Record<
        string,
        unknown
      >;
      if (['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        payload.allowedStatuses = getAllowedTransitions(report.status);
      }
      return res.json(payload);
    } catch (err) {
      console.error('Get report error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllowedStatuses(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const report = await prisma.report.findUnique({ where: { id }, select: { status: true } });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.json({ current: report.status, allowed: getAllowedTransitions(report.status) });
    } catch (err) {
      console.error('Get allowed statuses error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const parsed = updateReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const existing = await prisma.report.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Report not found' });

      // Only reporter can update own report when NEW; SafetyOfficer/Manager/Admin can update
      const user = req.user!;
      if (user.roleName === 'Reporter') {
        if (existing.reportedByUserId !== user.userId) return res.status(403).json({ error: 'Access denied' });
        if (existing.status !== ReportStatus.NEW && existing.status !== ReportStatus.DRAFT) {
          return res.status(403).json({ error: 'Report cannot be edited' });
        }
      }

      const report = await prisma.report.update({
        where: { id },
        data: parsed.data,
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
        },
      });
      if (['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        await writeAuditLog(prisma, {
          entityType: 'report',
          entityId: id,
          action: 'update',
          userId: user.userId,
          oldValue: { title: existing.title, description: existing.description },
          newValue: parsed.data,
        });
      }
      return res.json(report);
    } catch (err) {
      console.error('Update report error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const existing = await prisma.report.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Report not found' });

      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      if (!canTransition(existing.status, parsed.data.status)) {
        return res.status(400).json({
          error: `Geçiş izni yok: ${existing.status} -> ${parsed.data.status}`,
          allowed: getAllowedTransitions(existing.status),
        });
      }
      if (parsed.data.status === ReportStatus.CLOSED) {
        const closeErr = await validateCaseClosure(prisma, id);
        if (closeErr) return res.status(400).json({ error: closeErr });
        if (existing.currentRiskLevel === 'INTOLERABLE') {
          const anyRiskAccept = await prisma.caseApproval.findFirst({
            where: { reportId: id, approvalType: 'RISK_ACCEPTANCE', status: 'APPROVED' },
          });
          if (!anyRiskAccept) {
            return res.status(400).json({ error: 'Kabul edilemez risk için risk kabul onayı gerekli' });
          }
        }
      }
      await prisma.$transaction([
        prisma.report.update({
          where: { id },
          data: {
            status: parsed.data.status,
            ...(parsed.data.status === ReportStatus.CLOSED && {
              closedAt: new Date(),
              closureSummary: existing.closureSummary ?? 'Closed',
              lifecycleStatus: CaseLifecycleStatus.CLOSED,
            }),
          },
        }),
        prisma.reportStatusHistory.create({
          data: {
            reportId: id,
            fromStatus: existing.status,
            toStatus: parsed.data.status,
            changedByUserId: user.userId,
            comment: parsed.data.comment,
          },
        }),
      ]);

      if (parsed.data.status !== ReportStatus.CLOSED) {
        await recalculateLifecycleForReport(prisma, id);
      }

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
          actions: { select: { status: true } },
          effectivenessReview: true,
        },
      });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      const resolvedLifecycle =
        report.lifecycleStatus ??
        deriveLifecycle({
          reportStatus: report.status,
          actions: report.actions,
          effectiveness: report.effectivenessReview,
        });
      return res.json({
        ...report,
        lifecycleStatus: resolvedLifecycle,
        lifecycleLabel: lifecycleLabels[resolvedLifecycle],
      });
    } catch (err) {
      console.error('Update status error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async review(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const parsed = reviewUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const existing = await prisma.report.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Report not found' });

      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updateData: Record<string, unknown> = {};
      if (parsed.data.isSafetyRelated !== undefined) updateData.isSafetyRelated = parsed.data.isSafetyRelated;
      if (parsed.data.isMor !== undefined) updateData.isMor = parsed.data.isMor;
      if (parsed.data.morStatus !== undefined) updateData.morStatus = parsed.data.morStatus as MorStatus;
      if (parsed.data.morDeadline !== undefined) updateData.morDeadline = new Date(parsed.data.morDeadline);
      else if (parsed.data.isMor === true && !existing.morDeadline) {
        const d = new Date();
        d.setHours(d.getHours() + 72);
        updateData.morDeadline = d;
      }

      if (parsed.data.closureSummary !== undefined) updateData.closureSummary = parsed.data.closureSummary;
      if (parsed.data.caseTypeId !== undefined) updateData.caseTypeId = parsed.data.caseTypeId;
      if (parsed.data.mandatoryVoluntary !== undefined) updateData.mandatoryVoluntary = parsed.data.mandatoryVoluntary;
      if (parsed.data.occurrenceClassification !== undefined) updateData.occurrenceClassification = parsed.data.occurrenceClassification;
      if (parsed.data.immediateContainmentRequired !== undefined) {
        updateData.immediateContainmentRequired = parsed.data.immediateContainmentRequired;
      }
      if (parsed.data.investigationRequired !== undefined) updateData.investigationRequired = parsed.data.investigationRequired;
      if (parsed.data.riskAssessmentRequired !== undefined) updateData.riskAssessmentRequired = parsed.data.riskAssessmentRequired;
      if (parsed.data.externalReportingRequired !== undefined) {
        updateData.externalReportingRequired = parsed.data.externalReportingRequired;
      }
      if (parsed.data.screeningComment !== undefined) updateData.screeningComment = parsed.data.screeningComment;
      const screeningTouched =
        parsed.data.mandatoryVoluntary !== undefined ||
        parsed.data.occurrenceClassification !== undefined ||
        parsed.data.immediateContainmentRequired !== undefined ||
        parsed.data.investigationRequired !== undefined ||
        parsed.data.riskAssessmentRequired !== undefined ||
        parsed.data.externalReportingRequired !== undefined ||
        parsed.data.screeningComment !== undefined;
      if (screeningTouched) {
        updateData.screenedByUserId = user.userId;
        updateData.screenedAt = new Date();
      }

      if (parsed.data.status !== undefined) {
        if (!canTransition(existing.status, parsed.data.status)) {
          return res.status(400).json({
            error: `Geçiş izni yok: ${existing.status} -> ${parsed.data.status}`,
            allowed: getAllowedTransitions(existing.status),
          });
        }
        if (parsed.data.status === ReportStatus.CLOSED) {
          const closeErr = await validateCaseClosure(prisma, id);
          if (closeErr) return res.status(400).json({ error: closeErr });
          if (existing.currentRiskLevel === 'INTOLERABLE') {
            const anyRiskAccept = await prisma.caseApproval.findFirst({
              where: { reportId: id, approvalType: 'RISK_ACCEPTANCE', status: 'APPROVED' },
            });
            if (!anyRiskAccept) {
              return res.status(400).json({ error: 'Kabul edilemez risk için risk kabul onayı gerekli' });
            }
          }
        }
        updateData.status = parsed.data.status;
        if (parsed.data.status === ReportStatus.CLOSED) {
          updateData.closedAt = new Date();
          updateData.closureSummary = parsed.data.closureSummary ?? existing.closureSummary ?? 'Closed';
          updateData.lifecycleStatus = CaseLifecycleStatus.CLOSED;
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.report.update({ where: { id }, data: updateData });
        if (parsed.data.status !== undefined && parsed.data.status !== existing.status) {
          await tx.reportStatusHistory.create({
            data: {
              reportId: id,
              fromStatus: existing.status,
              toStatus: parsed.data.status!,
              changedByUserId: user.userId,
              comment: parsed.data.comment,
            },
          });
        }
      });

      if (parsed.data.status !== ReportStatus.CLOSED) {
        await recalculateLifecycleForReport(prisma, id);
      }

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
          actions: { select: { status: true } },
          effectivenessReview: true,
        },
      });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      const resolvedLifecycle =
        report.lifecycleStatus ??
        deriveLifecycle({
          reportStatus: report.status,
          actions: report.actions,
          effectiveness: report.effectivenessReview,
        });
      return res.json({
        ...report,
        lifecycleStatus: resolvedLifecycle,
        lifecycleLabel: lifecycleLabels[resolvedLifecycle],
      });
    } catch (err) {
      console.error('Review update error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateLifecycle(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = updateLifecycleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }
      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const existing = await prisma.report.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Report not found' });
      const target = parsed.data.lifecycleStatus;
      if (target === CaseLifecycleStatus.OPEN && existing.lifecycleStatus === CaseLifecycleStatus.DRAFT) {
        await prisma.report.update({
          where: { id },
          data: { lifecycleStatus: CaseLifecycleStatus.OPEN },
        });
      } else {
        return res.status(400).json({
          error:
            'Manuel olarak yalnızca DRAFT → OPEN desteklenir; diğer lifecycle değerleri aksiyon ve etkililik kayıtlarından otomatik hesaplanır.',
        });
      }
      await recalculateLifecycleForReport(prisma, id);
      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          actions: { select: { status: true } },
          effectivenessReview: true,
        },
      });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      const resolvedLifecycle =
        report.lifecycleStatus ??
        deriveLifecycle({
          reportStatus: report.status,
          actions: report.actions,
          effectiveness: report.effectivenessReview,
        });
      return res.json({
        ...report,
        lifecycleStatus: resolvedLifecycle,
        lifecycleLabel: lifecycleLabels[resolvedLifecycle],
      });
    } catch (err) {
      console.error('Update lifecycle error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async exportExcel(req: Request, res: Response) {
    try {
      const user = req.user!;
      const where: Record<string, unknown> = {};
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        where.OR = [{ reportedByUserId: user.userId }, ...(u?.departmentId ? [{ departmentId: u.departmentId }] : [])];
      }
      const reports = await prisma.report.findMany({
        where,
        include: { reportedBy: true, department: true, category: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Raporlar');
      sheet.columns = [
        { header: 'No', key: 'reportNo', width: 15 },
        { header: 'Başlık', key: 'title', width: 30 },
        { header: 'Tarih', key: 'createdAt', width: 12 },
        { header: 'Departman', key: 'department', width: 15 },
        { header: 'Durum', key: 'status', width: 20 },
        { header: 'Risk', key: 'currentRiskLevel', width: 12 },
      ];
      sheet.addRows(reports.map((r) => ({
        reportNo: r.reportNo,
        title: r.title,
        createdAt: r.createdAt.toISOString().slice(0, 10),
        department: r.department?.name ?? '',
        status: r.status,
        currentRiskLevel: r.currentRiskLevel ?? '',
      })));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=raporlar.xlsx');
      await workbook.xlsx.write(res);
    } catch (err) {
      console.error('Export error:', err);
      return res.status(500).json({ error: 'Export failed' });
    }
  },
};
