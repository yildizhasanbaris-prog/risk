import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

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
            where: { reportId: idFilter, status: { notIn: ['DONE', 'CANCELLED'] } },
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

      return res.json({
        totalReports: total,
        openHazards: hazardsCount,
        openHighRisks: intolerableCount,
        openActions: openActionsList.length,
        overdueMitigations,
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
    const items = await prisma.lessonLearned.findMany({ orderBy: { promotedAt: 'desc' }, take: 100 });
    return res.json(items);
  },

  async promoteLesson(req: Request, res: Response) {
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
  },
};
