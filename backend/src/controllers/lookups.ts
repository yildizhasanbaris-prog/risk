import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const lookupController = {
  async severity(_req: Request, res: Response) {
    try {
      const data = await prisma.severityLevel.findMany({ orderBy: { sortOrder: 'asc' } });
      return res.json(data);
    } catch (err) {
      console.error('Severity lookup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async likelihood(_req: Request, res: Response) {
    try {
      const data = await prisma.likelihoodLevel.findMany({ orderBy: { sortOrder: 'asc' } });
      return res.json(data);
    } catch (err) {
      console.error('Likelihood lookup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async riskMatrix(_req: Request, res: Response) {
    try {
      const data = await prisma.riskMatrix.findMany({
        include: {
          severity: { select: { code: true, description: true } },
          likelihood: { select: { code: true, description: true } },
        },
      });
      return res.json(data);
    } catch (err) {
      console.error('Risk matrix lookup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async categories(_req: Request, res: Response) {
    try {
      const data = await prisma.category.findMany({ orderBy: { code: 'asc' } });
      return res.json(data);
    } catch (err) {
      console.error('Categories lookup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async departments(_req: Request, res: Response) {
    try {
      const data = await prisma.department.findMany({ orderBy: { code: 'asc' } });
      return res.json(data);
    } catch (err) {
      console.error('Departments lookup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async riskCalculate(req: Request, res: Response) {
    try {
      const severity = String(req.query.severity || '').toUpperCase();
      const likelihood = parseInt(String(req.query.likelihood || ''), 10);
      if (!severity || !['A', 'B', 'C', 'D', 'E'].includes(severity) || !likelihood || likelihood < 1 || likelihood > 5) {
        return res.status(400).json({ error: 'Invalid severity (A-E) or likelihood (1-5)' });
      }
      const matrix = await prisma.riskMatrix.findUnique({
        where: { severityCode_likelihoodCode: { severityCode: severity, likelihoodCode: likelihood } },
      });
      if (!matrix) return res.status(404).json({ error: 'Risk combination not found' });
      return res.json({ riskIndex: matrix.riskIndex, riskLevel: matrix.riskLevel });
    } catch (err) {
      console.error('Risk calculate error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
