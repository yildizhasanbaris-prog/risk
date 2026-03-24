import { Request, Response } from 'express';
import { Prisma, ReportStatus, CaseLifecycleStatus } from '@prisma/client';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';

function baseWhere(user: { userId: number; roleName: string }) {
  const where: Record<string, unknown> = {};
  if (user.roleName === 'Reporter') {
    return (async () => {
      const u = await prisma.user.findUnique({ where: { id: user.userId } });
      return {
        OR: [{ reportedByUserId: user.userId }, ...(u?.departmentId ? [{ departmentId: u.departmentId }] : [])],
      };
    })();
  }
  return Promise.resolve(where);
}

export const dashboardController = {
  async stats(req: Request, res: Response) {
    try {
      const user = req.user!;
      const where = await baseWhere(user);

      const reportIds = (await prisma.report.findMany({ where, select: { id: true } })).map((r) => r.id);
      const idFilter = reportIds.length ? { in: reportIds } : { in: [-1] };

      const [total, byStatus, openActionsList, hazardsCount, intolerableCount, hfCases, subcontractorCases, changeCases] =
        await Promise.all([
          prisma.report.count({ where }),
          prisma.report.groupBy({ by: ['status'], where, _count: true }),
          prisma.action.findMany({
            where: { reportId: idFilter, status: { notIn: ['DONE', 'VERIFIED', 'CANCELLED'] } },
            select: { id: true, dueDate: true, revisedDueDate: true, reportId: true },
          }),
          prisma.hazard.count({ where: { reportId: idFilter } }),
          prisma.report.count({ where: { ...where, currentRiskLevel: 'INTOLERABLE', status: { not: 'CLOSED' } } }),
          prisma.report.count({
            where: {
              AND: [
                where,
                { status: { not: 'CLOSED' } },
                { OR: [{ occurrenceClassification: 'HF_ISSUE' }, { category: { code: 'HF' } }] },
              ],
            },
          }),
          prisma.report.count({
            where: {
              AND: [where, { status: { not: 'CLOSED' } }, { occurrenceClassification: 'SUBCONTRACTOR_SAFETY' }],
            },
          }),
          prisma.report.count({
            where: {
              AND: [where, { status: { not: 'CLOSED' } }, { occurrenceClassification: 'CHANGE_RELATED' }],
            },
          }),
        ]);

      const now = new Date();
      const overdueMitigations = openActionsList.filter((a) => {
        const due = a.revisedDueDate ?? a.dueDate;
        return due != null && due < now;
      }).length;

      const morAlerts = await prisma.report.findMany({
        where: { ...where, isMor: true, morDeadline: { not: null }, status: { notIn: ['CLOSED', 'NOT_SAFETY_RELATED'] } },
        select: { id: true, reportNo: true, title: true, morDeadline: true },
        take: 10,
      });
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const morUrgent = morAlerts.filter((r) => r.morDeadline && r.morDeadline > now && r.morDeadline < in24h);

      const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

      const closedWithDates = await prisma.report.findMany({
        where: { AND: [where, { closedAt: { not: null } }] },
        select: { createdAt: true, closedAt: true },
        take: 200,
      });
      let avgClosureDays = 0;
      if (closedWithDates.length) {
        const sum = closedWithDates.reduce((acc, r) => {
          if (!r.closedAt) return acc;
          return acc + (r.closedAt.getTime() - r.createdAt.getTime()) / (86400000);
        }, 0);
        avgClosureDays = Math.round((sum / closedWithDates.length) * 10) / 10;
      }

      const effectivenessRows = await prisma.effectivenessReview.findMany({
        where: { reportId: idFilter },
        select: { controlEffective: true },
      });
      const effTotal = effectivenessRows.filter((e) => e.controlEffective !== null).length;
      const effPass = effectivenessRows.filter((e) => e.controlEffective === true).length;
      const effectivenessPassRate = effTotal ? Math.round((effPass / effTotal) * 100) : null;

      const forTrend = await prisma.report.findMany({ where, select: { createdAt: true }, take: 500 });
      const byMonth: Record<string, number> = {};
      for (const t of forTrend) {
        const key = t.createdAt.toISOString().slice(0, 7);
        byMonth[key] = (byMonth[key] ?? 0) + 1;
      }

      const [monitoringBacklog, pendingApprovals] = await Promise.all([
        prisma.report.count({
          where: {
            AND: [
              where,
              { status: { not: ReportStatus.CLOSED } },
              {
                OR: [
                  { lifecycleStatus: CaseLifecycleStatus.MONITORING },
                  { status: ReportStatus.PENDING_EFFECTIVENESS_CHECK },
                ],
              },
            ],
          },
        }),
        prisma.caseApproval.count({
          where: { status: 'PENDING', reportId: idFilter },
        }),
      ]);

      return res.json({
        totalReports: total,
        openHazards: hazardsCount,
        openHighRisks: intolerableCount,
        openActions: openActionsList.length,
        overdueMitigations,
        monitoringBacklog,
        pendingApprovals,
        byStatus: statusCounts,
        averageClosureLeadDays: avgClosureDays,
        hfRelatedOpen: hfCases,
        subcontractorRelatedOpen: subcontractorCases,
        changeRelatedOpen: changeCases,
        mitigationEffectivenessPassRate: effectivenessPassRate,
        riskTrendByMonth: byMonth,
        morAlerts: morUrgent.map((r) => ({
          id: r.id,
          reportNo: r.reportNo,
          title: r.title,
          morDeadline: r.morDeadline,
        })),
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /** SRB meeting pack: JSON bundle for selected case IDs */
  async srbPack(req: Request, res: Response) {
    try {
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(req.user!.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const ids = String(req.query.ids || '')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      if (!ids.length) return res.status(400).json({ error: 'ids query required (comma-separated)' });

      const cases = await prisma.report.findMany({
        where: { id: { in: ids } },
        include: {
          reportedBy: { select: { name: true, email: true } },
          department: true,
          caseType: true,
          hazards: true,
          riskAssessments: true,
          actions: { include: { owner: { select: { name: true } } } },
          investigation: true,
          effectivenessReview: true,
          approvals: true,
        },
      });

      return res.json({
        generatedAt: new Date().toISOString(),
        caseCount: cases.length,
        cases,
      });
    } catch (err) {
      console.error('SRB pack error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async listLessons(_req: Request, res: Response) {
    try {
      const items = await prisma.lessonLearned.findMany({ orderBy: { promotedAt: 'desc' }, take: 100 });
      return res.json(items);
    } catch (err) {
      console.error('listLessons error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async actionBoard(req: Request, res: Response) {
    try {
      const user = req.user!;
      const overdueOnly = req.query.overdue === '1';
      const mine = req.query.mine === '1';

      const actionWhere: Prisma.ActionWhereInput = {};
      if (mine) actionWhere.ownerUserId = user.userId;
      if (overdueOnly) {
        const now = new Date();
        actionWhere.NOT = { status: { in: ['DONE', 'VERIFIED', 'CANCELLED'] } };
        actionWhere.OR = [{ dueDate: { lt: now } }, { revisedDueDate: { lt: now } }];
      }

      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        actionWhere.report = {
          OR: [
            { reportedByUserId: user.userId },
            ...(u?.departmentId ? [{ departmentId: u.departmentId }] : []),
          ],
        };
      }

      const actions = await prisma.action.findMany({
        where: actionWhere,
        take: 300,
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        include: {
          report: { select: { id: true, reportNo: true, title: true, currentRiskLevel: true } },
          owner: { select: { id: true, name: true } },
        },
      });

      const now = new Date();
      const rows = actions.map((a) => {
        const due = a.revisedDueDate ?? a.dueDate;
        const terminal = ['DONE', 'VERIFIED', 'CANCELLED'].includes(a.status);
        const overdueDays =
          !terminal && due && due < now
            ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000))
            : 0;
        return { ...a, overdueDays };
      });

      return res.json(rows);
    } catch (err) {
      console.error('Action board error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async registers(req: Request, res: Response) {
    try {
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(req.user!.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const [cases, riskRegister, mitigationRegister, changeRegister] = await Promise.all([
        prisma.report.findMany({
          take: 150,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reportNo: true,
            title: true,
            status: true,
            lifecycleStatus: true,
            safetyCaseKind: true,
            currentRiskLevel: true,
            createdAt: true,
            closedAt: true,
          },
        }),
        prisma.riskAssessment.findMany({
          take: 200,
          orderBy: { id: 'desc' },
          include: {
            report: { select: { reportNo: true, title: true } },
            riskOwner: { select: { name: true } },
            hazard: { select: { statement: true } },
          },
        }),
        prisma.action.findMany({
          take: 200,
          orderBy: { id: 'desc' },
          include: {
            report: { select: { reportNo: true, title: true } },
            owner: { select: { name: true } },
          },
        }),
        prisma.report.findMany({
          where: { safetyCaseKind: 'CHANGE' },
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: { id: true, reportNo: true, title: true, status: true, lifecycleStatus: true },
        }),
      ]);
      return res.json({ cases, riskRegister, mitigationRegister, changeRegister });
    } catch (err) {
      console.error('Registers error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async promoteLesson(req: Request, res: Response) {
    try {
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(req.user!.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const parsed = z
        .object({
          reportId: z.number().optional(),
          title: z.string().min(1),
          summary: z.string().min(1),
          category: z.string().optional(),
        })
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const row = await prisma.lessonLearned.create({ data: parsed.data });
      return res.status(201).json(row);
    } catch (err) {
      console.error('promoteLesson error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async srbPackExcel(req: Request, res: Response) {
    try {
      const ids = String(req.query.ids || '')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      if (!ids.length) return res.status(400).json({ error: 'ids query required' });

      const cases = await prisma.report.findMany({
        where: { id: { in: ids } },
        include: {
          reportedBy: { select: { name: true } },
          department: true,
          caseType: true,
          riskAssessments: { include: { assessedBy: { select: { name: true } } } },
          actions: { include: { owner: { select: { name: true } } } },
          approvals: { include: { signedBy: { select: { name: true } } } },
        },
      });

      const wb = new ExcelJS.Workbook();
      wb.creator = 'SMS Risk Analizi';
      wb.created = new Date();

      const caseSheet = wb.addWorksheet('Cases');
      caseSheet.columns = [
        { header: 'Report No', key: 'reportNo', width: 18 },
        { header: 'Başlık', key: 'title', width: 35 },
        { header: 'Durum', key: 'status', width: 18 },
        { header: 'Risk Seviyesi', key: 'riskLevel', width: 15 },
        { header: 'Departman', key: 'dept', width: 15 },
        { header: 'Vaka Türü', key: 'caseType', width: 18 },
        { header: 'Raporlayan', key: 'reporter', width: 20 },
        { header: 'Tarih', key: 'date', width: 14 },
      ];
      for (const c of cases) {
        caseSheet.addRow({
          reportNo: c.reportNo,
          title: c.title,
          status: c.status,
          riskLevel: c.currentRiskLevel ?? '—',
          dept: c.department?.name ?? '',
          caseType: c.caseType?.description ?? '',
          reporter: c.reportedBy?.name ?? '',
          date: c.createdAt.toISOString().slice(0, 10),
        });
      }
      styleHeader(caseSheet);

      const riskSheet = wb.addWorksheet('Risk Assessments');
      riskSheet.columns = [
        { header: 'Report No', key: 'reportNo', width: 18 },
        { header: 'Tehlike', key: 'hazard', width: 30 },
        { header: 'Severity', key: 'sev', width: 10 },
        { header: 'Likelihood', key: 'lik', width: 12 },
        { header: 'Risk Index', key: 'idx', width: 12 },
        { header: 'Risk Level', key: 'level', width: 14 },
        { header: 'Değerlendiren', key: 'assessor', width: 20 },
      ];
      for (const c of cases) {
        for (const ra of c.riskAssessments) {
          riskSheet.addRow({
            reportNo: c.reportNo,
            hazard: ra.hazardDescription,
            sev: ra.severityCode,
            lik: ra.likelihoodCode,
            idx: ra.riskIndex,
            level: ra.riskLevel,
            assessor: ra.assessedBy?.name ?? '',
          });
        }
      }
      styleHeader(riskSheet);

      const actionSheet = wb.addWorksheet('Actions');
      actionSheet.columns = [
        { header: 'Report No', key: 'reportNo', width: 18 },
        { header: 'Aksiyon', key: 'desc', width: 35 },
        { header: 'Sorumlu', key: 'owner', width: 20 },
        { header: 'Durum', key: 'status', width: 14 },
        { header: 'Son Tarih', key: 'due', width: 14 },
        { header: 'Öncelik', key: 'priority', width: 10 },
      ];
      for (const c of cases) {
        for (const a of c.actions) {
          actionSheet.addRow({
            reportNo: c.reportNo,
            desc: a.description,
            owner: a.owner?.name ?? '',
            status: a.status,
            due: a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : '',
            priority: a.priority ?? '',
          });
        }
      }
      styleHeader(actionSheet);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=SRB_Pack_${new Date().toISOString().slice(0, 10)}.xlsx`);
      await wb.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('srbPackExcel error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

function styleHeader(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.alignment = { vertical: 'middle' };
}
