import { Request, Response } from 'express';
import { AssessmentType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const riskAssessmentFields = z.object({
  assessmentType: z.enum(['INITIAL', 'RESIDUAL', 'INTERMEDIATE']),
  hazardId: z.number().optional(),
  hazardCategoryId: z.number().optional(),
  hazardDescription: z.string().optional(),
  consequences: z.string().optional(),
  existingControls: z.string().optional(),
  proposedControls: z.string().optional(),
  severityCode: z.enum(['A', 'B', 'C', 'D', 'E']),
  likelihoodCode: z.number().min(1).max(5),
  riskOwnerUserId: z.number().optional(),
  acceptanceLevel: z.string().optional(),
  reviewDueDate: z.string().optional(),
});

const createSchema = riskAssessmentFields.superRefine((data, ctx) => {
  if (data.assessmentType === 'INITIAL') {
    if (data.riskOwnerUserId == null) {
      ctx.addIssue({ code: 'custom', message: 'Risk kalemi için risk sahibi zorunlu', path: ['riskOwnerUserId'] });
    }
    if (!data.reviewDueDate?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Risk gözden geçirme tarihi zorunlu', path: ['reviewDueDate'] });
    }
    if (!data.existingControls?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Mevcut kontroller zorunlu', path: ['existingControls'] });
    }
  }
});

const updateSchema = riskAssessmentFields.partial();

async function calculateRisk(severityCode: string, likelihoodCode: number) {
  const matrix = await prisma.riskMatrix.findUnique({
    where: { severityCode_likelihoodCode: { severityCode, likelihoodCode } },
  });
  return matrix ? { riskIndex: matrix.riskIndex, riskLevel: matrix.riskLevel } : null;
}

export const riskAssessmentController = {
  async list(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report ID' });

      const user = req.user!;
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        const canView =
          report.reportedByUserId === user.userId ||
          (u?.departmentId && report.departmentId === u.departmentId);
        if (!canView) return res.status(403).json({ error: 'Access denied' });
      }

      const assessments = await prisma.riskAssessment.findMany({
        where: { reportId },
        include: {
          assessedBy: { select: { id: true, name: true } },
          hazard: true,
          riskOwner: { select: { id: true, name: true } },
        },
        orderBy: { assessedAt: 'desc' },
      });
      return res.json(assessments);
    } catch (err) {
      console.error('List risk assessments error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report ID' });

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const risk = await calculateRisk(parsed.data.severityCode, parsed.data.likelihoodCode);
      if (!risk) return res.status(400).json({ error: 'Invalid severity/likelihood combination' });

      const assessment = await prisma.riskAssessment.create({
        data: {
          reportId,
          hazardId: parsed.data.hazardId,
          hazardCategoryId: parsed.data.hazardCategoryId,
          assessmentType: parsed.data.assessmentType as AssessmentType,
          hazardDescription: parsed.data.hazardDescription,
          consequences: parsed.data.consequences,
          existingControls: parsed.data.existingControls,
          proposedControls: parsed.data.proposedControls,
          severityCode: parsed.data.severityCode,
          likelihoodCode: parsed.data.likelihoodCode,
          riskIndex: risk.riskIndex,
          riskLevel: risk.riskLevel,
          riskOwnerUserId: parsed.data.riskOwnerUserId,
          acceptanceLevel: parsed.data.acceptanceLevel,
          reviewDueDate: parsed.data.reviewDueDate ? new Date(parsed.data.reviewDueDate) : undefined,
          assessedByUserId: user.userId,
          assessedAt: new Date(),
        },
        include: { assessedBy: { select: { id: true, name: true } } },
      });

      await prisma.report.update({
        where: { id: reportId },
        data: { currentRiskLevel: risk.riskLevel },
      });

      return res.status(201).json(assessment);
    } catch (err) {
      console.error('Create risk assessment error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const assessmentId = parseInt(req.params.assessmentId, 10);
      if (isNaN(reportId) || isNaN(assessmentId)) return res.status(400).json({ error: 'Invalid ID' });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const user = req.user!;
      if (!['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const existing = await prisma.riskAssessment.findFirst({
        where: { id: assessmentId, reportId },
      });
      if (!existing) return res.status(404).json({ error: 'Risk assessment not found' });

      const severityCode = parsed.data.severityCode ?? existing.severityCode;
      const likelihoodCode = parsed.data.likelihoodCode ?? existing.likelihoodCode;
      let risk = existing.riskIndex && existing.riskLevel
        ? { riskIndex: existing.riskIndex, riskLevel: existing.riskLevel }
        : null;

      if (severityCode && likelihoodCode) {
        risk = await calculateRisk(severityCode, likelihoodCode);
        if (!risk) {
          return res.status(400).json({ error: 'Geçersiz şiddet/olasılık kombinasyonu — risk matrisi eşleşmedi' });
        }
      }

      const { reviewDueDate, ...restUpdate } = parsed.data;
      const assessment = await prisma.riskAssessment.update({
        where: { id: assessmentId },
        data: {
          ...restUpdate,
          ...(reviewDueDate !== undefined && {
            reviewDueDate: reviewDueDate ? new Date(reviewDueDate) : null,
          }),
          ...(risk && {
            riskIndex: risk.riskIndex,
            riskLevel: risk.riskLevel,
          }),
        },
        include: { assessedBy: { select: { id: true, name: true } } },
      });

      if (risk) {
        await prisma.report.update({
          where: { id: reportId },
          data: { currentRiskLevel: assessment.riskLevel },
        });
      }

      return res.json(assessment);
    } catch (err) {
      console.error('Update risk assessment error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
