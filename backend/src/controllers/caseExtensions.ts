import { Request, Response } from 'express';
import { ApprovalType, ApprovalStatus } from '@prisma/client';
import { z } from 'zod';
import { recalculateLifecycleForReport } from '../services/CaseLifecycleService';
import { prisma } from '../lib/prisma';

const hazardSchema = z.object({ statement: z.string().min(1), topEvent: z.string().optional() });
const investigationSchema = z.object({
  chronology: z.string().optional(),
  contributoryFactors: z.string().optional(),
  hfFactors: z.string().optional(),
  organisationalFactors: z.string().optional(),
  subcontractorFactors: z.string().optional(),
  rootCause: z.string().optional(),
  lessonsLearned: z.string().optional(),
  leadUserId: z.number().optional(),
});
const effectivenessSchema = z.object({
  implementationVerified: z.boolean().optional(),
  evidenceChecked: z.boolean().optional(),
  controlEffective: z.boolean().optional(),
  repeatEvent: z.boolean().optional(),
  spiTrendNote: z.string().optional(),
  residualRiskReduced: z.boolean().optional(),
  residualSeverityCode: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  residualLikelihoodCode: z.number().min(1).max(5).optional(),
  residualRiskIndex: z.string().optional(),
  residualRiskLevel: z.string().optional(),
  furtherActionRequired: z.boolean().optional(),
  reviewerComment: z.string().optional(),
});
const caseReviewSchema = z.object({
  duplicateFlag: z.boolean().optional(),
  requiresInvestigation: z.boolean().optional(),
  requiresRiskAssessment: z.boolean().optional(),
  requiresImmediateAction: z.boolean().optional(),
  caseTypeConfirmed: z.boolean().optional(),
});
const approvalSchema = z.object({
  approvalType: z.nativeEnum(ApprovalType),
  requiredRoleHint: z.string().optional(),
  approvalRouteId: z.number().optional(),
  riskAssessmentId: z.number().optional(),
  actionId: z.number().optional(),
});
const signApprovalSchema = z.object({
  status: z.nativeEnum(ApprovalStatus),
  comment: z.string().optional(),
});
const commentSchema = z.object({ body: z.string().min(1) });

function canStaff(user: { roleName: string }) {
  return ['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName);
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export const caseExtensionsController = {
  async listHazards(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const items = await prisma.hazard.findMany({ where: { reportId }, orderBy: { sortOrder: 'asc' } });
      return res.json(items);
    } catch (err) {
      console.error('listHazards error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createHazard(req: Request, res: Response) {
    try {
      if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = hazardSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const count = await prisma.hazard.count({ where: { reportId } });
      const h = await prisma.hazard.create({
        data: { reportId, statement: parsed.data.statement, topEvent: parsed.data.topEvent, sortOrder: count },
      });
      return res.status(201).json(h);
    } catch (err) {
      console.error('createHazard error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getInvestigation(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const inv = await prisma.investigation.findUnique({ where: { reportId }, include: { lead: { select: { id: true, name: true } } } });
      return res.json(inv);
    } catch (err) {
      console.error('getInvestigation error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async upsertInvestigation(req: Request, res: Response) {
    try {
      if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = investigationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const inv = await prisma.investigation.upsert({
        where: { reportId },
        create: { reportId, ...parsed.data },
        update: parsed.data,
        include: { lead: { select: { id: true, name: true } } },
      });
      return res.json(inv);
    } catch (err) {
      console.error('upsertInvestigation error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getEffectiveness(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const e = await prisma.effectivenessReview.findUnique({ where: { reportId } });
      return res.json(e);
    } catch (err) {
      console.error('getEffectiveness error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async upsertEffectiveness(req: Request, res: Response) {
    try {
      if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = effectivenessSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const userId = req.user!.userId;
      const e = await prisma.effectivenessReview.upsert({
        where: { reportId },
        create: { reportId, ...parsed.data, reviewedByUserId: userId, reviewedAt: new Date() },
        update: { ...parsed.data, reviewedByUserId: userId, reviewedAt: new Date() },
      });
      await recalculateLifecycleForReport(prisma, reportId);
      return res.json(e);
    } catch (err) {
      console.error('upsertEffectiveness error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getCaseReview(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const row = await prisma.caseReview.findUnique({
        where: { reportId },
        include: { reviewer: { select: { id: true, name: true } } },
      });
      return res.json(row);
    } catch (err) {
      console.error('getCaseReview error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async upsertCaseReview(req: Request, res: Response) {
    try {
      if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = caseReviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      if (parsed.data.duplicateFlag === true) {
        const r = await prisma.report.findUnique({ where: { id: reportId }, select: { linkedCaseId: true } });
        if (!r?.linkedCaseId) {
          return res.status(400).json({ error: 'Duplicate işaretliyse ilgili ana case bağlantısı (linkedCaseId) raporda dolu olmalıdır' });
        }
      }
      const userId = req.user!.userId;
      const row = await prisma.caseReview.upsert({
        where: { reportId },
        create: { reportId, reviewerUserId: userId, ...parsed.data },
        update: { ...parsed.data, reviewerUserId: userId, reviewDate: new Date() },
        include: { reviewer: { select: { id: true, name: true } } },
      });
      return res.json(row);
    } catch (err) {
      console.error('upsertCaseReview error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async listApprovals(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const items = await prisma.caseApproval.findMany({
        where: { reportId },
        include: { signedBy: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' },
      });
      return res.json(items);
    } catch (err) {
      console.error('listApprovals error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createApproval(req: Request, res: Response) {
    try {
      if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = approvalSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const a = await prisma.caseApproval.create({
        data: {
          reportId,
          approvalType: parsed.data.approvalType,
          requiredRoleHint: parsed.data.requiredRoleHint,
          approvalRouteId: parsed.data.approvalRouteId,
          riskAssessmentId: parsed.data.riskAssessmentId,
          actionId: parsed.data.actionId,
          status: ApprovalStatus.PENDING,
        },
      });
      return res.status(201).json(a);
    } catch (err) {
      console.error('createApproval error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async signApproval(req: Request, res: Response) {
    try {
      if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
      const reportId = parseId(req.params.id);
      const approvalId = parseId(req.params.approvalId);
      if (!reportId || !approvalId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = signApprovalSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const existing = await prisma.caseApproval.findFirst({ where: { id: approvalId, reportId } });
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const a = await prisma.caseApproval.update({
        where: { id: approvalId },
        data: {
          status: parsed.data.status,
          comment: parsed.data.comment,
          signedByUserId: req.user!.userId,
          signedAt: new Date(),
        },
      });
      return res.json(a);
    } catch (err) {
      console.error('signApproval error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async listComments(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const items = await prisma.caseComment.findMany({
        where: { reportId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return res.json(items);
    } catch (err) {
      console.error('listComments error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createComment(req: Request, res: Response) {
    try {
      const reportId = parseId(req.params.id);
      if (!reportId) return res.status(400).json({ error: 'Invalid ID' });
      const parsed = commentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      const c = await prisma.caseComment.create({
        data: { reportId, userId: req.user!.userId, body: parsed.data.body },
        include: { user: { select: { id: true, name: true } } },
      });
      return res.status(201).json(c);
    } catch (err) {
      console.error('createComment error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
