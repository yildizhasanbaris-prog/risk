import { Request, Response } from 'express';
import { PrismaClient, ApprovalType, ApprovalStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

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
  controlEffective: z.boolean().optional(),
  repeatEvent: z.boolean().optional(),
  spiTrendNote: z.string().optional(),
  residualRiskReduced: z.boolean().optional(),
  furtherActionRequired: z.boolean().optional(),
  reviewerComment: z.string().optional(),
});
const approvalSchema = z.object({
  approvalType: z.nativeEnum(ApprovalType),
  requiredRoleHint: z.string().optional(),
});
const signApprovalSchema = z.object({
  status: z.nativeEnum(ApprovalStatus),
  comment: z.string().optional(),
});
const commentSchema = z.object({ body: z.string().min(1) });

function canStaff(user: { roleName: string }) {
  return ['SafetyOfficer', 'Manager', 'Admin'].includes(user.roleName);
}

export const caseExtensionsController = {
  async listHazards(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid ID' });
    const items = await prisma.hazard.findMany({ where: { reportId }, orderBy: { sortOrder: 'asc' } });
    return res.json(items);
  },

  async createHazard(req: Request, res: Response) {
    if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
    const reportId = parseInt(req.params.id, 10);
    const parsed = hazardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const count = await prisma.hazard.count({ where: { reportId } });
    const h = await prisma.hazard.create({
      data: { reportId, statement: parsed.data.statement, topEvent: parsed.data.topEvent, sortOrder: count },
    });
    return res.status(201).json(h);
  },

  async getInvestigation(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    const inv = await prisma.investigation.findUnique({ where: { reportId }, include: { lead: { select: { id: true, name: true } } } });
    return res.json(inv);
  },

  async upsertInvestigation(req: Request, res: Response) {
    if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
    const reportId = parseInt(req.params.id, 10);
    const parsed = investigationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const inv = await prisma.investigation.upsert({
      where: { reportId },
      create: { reportId, ...parsed.data },
      update: parsed.data,
      include: { lead: { select: { id: true, name: true } } },
    });
    return res.json(inv);
  },

  async getEffectiveness(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    const e = await prisma.effectivenessReview.findUnique({ where: { reportId } });
    return res.json(e);
  },

  async upsertEffectiveness(req: Request, res: Response) {
    if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
    const reportId = parseInt(req.params.id, 10);
    const parsed = effectivenessSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const userId = req.user!.userId;
    const e = await prisma.effectivenessReview.upsert({
      where: { reportId },
      create: { reportId, ...parsed.data, reviewedByUserId: userId, reviewedAt: new Date() },
      update: { ...parsed.data, reviewedByUserId: userId, reviewedAt: new Date() },
    });
    return res.json(e);
  },

  async listApprovals(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    const items = await prisma.caseApproval.findMany({
      where: { reportId },
      include: { signedBy: { select: { id: true, name: true } } },
      orderBy: { id: 'asc' },
    });
    return res.json(items);
  },

  async createApproval(req: Request, res: Response) {
    if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
    const reportId = parseInt(req.params.id, 10);
    const parsed = approvalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const a = await prisma.caseApproval.create({
      data: {
        reportId,
        approvalType: parsed.data.approvalType,
        requiredRoleHint: parsed.data.requiredRoleHint,
        status: ApprovalStatus.PENDING,
      },
    });
    return res.status(201).json(a);
  },

  async signApproval(req: Request, res: Response) {
    if (!canStaff(req.user!)) return res.status(403).json({ error: 'Insufficient permissions' });
    const reportId = parseInt(req.params.id, 10);
    const approvalId = parseInt(req.params.approvalId, 10);
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
  },

  async listComments(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    const items = await prisma.caseComment.findMany({
      where: { reportId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(items);
  },

  async createComment(req: Request, res: Response) {
    const reportId = parseInt(req.params.id, 10);
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    const c = await prisma.caseComment.create({
      data: { reportId, userId: req.user!.userId, body: parsed.data.body },
      include: { user: { select: { id: true, name: true } } },
    });
    return res.status(201).json(c);
  },
};
