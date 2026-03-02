import { Request, Response } from 'express';
import { PrismaClient, ReportStatus, MorStatus } from '@prisma/client';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { canTransition, getAllowedTransitions } from '../services/StatusWorkflowService';

const prisma = new PrismaClient();

const createReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  departmentId: z.number().optional(),
  location: z.string().optional(),
  aircraftReg: z.string().optional(),
  aircraftType: z.string().optional(),
  componentPn: z.string().optional(),
  componentSn: z.string().optional(),
  immediateActions: z.string().optional(),
  categoryId: z.number().optional(),
});

const updateReportSchema = createReportSchema.partial();

const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  comment: z.string().optional(),
});

const reviewUpdateSchema = z.object({
  isSafetyRelated: z.boolean().optional(),
  isMor: z.boolean().optional(),
  morDeadline: z.union([z.string(), z.date()]).optional(),
  morStatus: z.enum(['NONE', 'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED']).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  comment: z.string().optional(),
  closureSummary: z.string().optional(),
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
        },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
        },
      });
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
          riskAssessments: { include: { assessedBy: { select: { id: true, name: true } } } },
          actions: { include: { owner: { select: { id: true, name: true, email: true } } } },
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

      const payload = { ...report } as Record<string, unknown>;
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
        if (existing.status !== ReportStatus.NEW) return res.status(403).json({ error: 'Report cannot be edited' });
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
      await prisma.$transaction([
        prisma.report.update({
          where: { id },
          data: {
            status: parsed.data.status,
            ...(parsed.data.status === ReportStatus.CLOSED && {
              closedAt: new Date(),
              closureSummary: existing.closureSummary ?? 'Closed',
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

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
        },
      });
      return res.json(report);
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
      if (parsed.data.status !== undefined) {
        if (!canTransition(existing.status, parsed.data.status)) {
          return res.status(400).json({
            error: `Geçiş izni yok: ${existing.status} -> ${parsed.data.status}`,
            allowed: getAllowedTransitions(existing.status),
          });
        }
        updateData.status = parsed.data.status;
        if (parsed.data.status === ReportStatus.CLOSED) {
          updateData.closedAt = new Date();
          updateData.closureSummary = parsed.data.closureSummary ?? existing.closureSummary ?? 'Closed';
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

      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          department: { select: { code: true, name: true } },
          category: { select: { code: true, description: true } },
        },
      });
      return res.json(report);
    } catch (err) {
      console.error('Review update error:', err);
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
