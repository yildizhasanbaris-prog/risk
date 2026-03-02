import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dashboardController = {
  async stats(req: Request, res: Response) {
    try {
      const user = req.user!;
      const where: Record<string, unknown> = {};
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        where.OR = [
          { reportedByUserId: user.userId },
          ...(u?.departmentId ? [{ departmentId: u.departmentId }] : []),
        ];
      }

      const [total, byStatus, actions] = await Promise.all([
        prisma.report.count({ where }),
        prisma.report.groupBy({ by: ['status'], where, _count: true }),
        prisma.action.findMany({ where: { status: { not: 'DONE' } }, select: { reportId: true } }),
      ]);
      const reportIds = new Set((await prisma.report.findMany({ where, select: { id: true } })).map((r) => r.id));
      const openActions = actions.filter((a) => reportIds.has(a.reportId)).length;

      const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

      const morAlerts = await prisma.report.findMany({
        where: { ...where, isMor: true, morDeadline: { not: null }, status: { notIn: ['CLOSED', 'NOT_SAFETY_RELATED'] } },
        select: { id: true, reportNo: true, title: true, morDeadline: true },
        take: 10,
      });
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const morUrgent = morAlerts.filter((r) => r.morDeadline && r.morDeadline > now && r.morDeadline < in24h);

      return res.json({
        totalReports: total,
        openActions,
        byStatus: statusCounts,
        morAlerts: morUrgent.map((r) => ({ id: r.id, reportNo: r.reportNo, title: r.title, morDeadline: r.morDeadline })),
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
