import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { prisma } from '../lib/prisma';

export const attachmentController = {
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

      const attachments = await prisma.reportAttachment.findMany({
        where: { reportId },
        include: { uploader: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: 'desc' },
      });
      return res.json(attachments);
    } catch (err) {
      console.error('List attachments error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async upload(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report ID' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const user = req.user!;
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        const canUpload = report.reportedByUserId === user.userId || (u?.departmentId && report.departmentId === u.departmentId);
        if (!canUpload) return res.status(403).json({ error: 'Access denied' });
      }

      const attachment = await prisma.reportAttachment.create({
        data: {
          reportId,
          filePath: req.file.filename,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          uploadedByUserId: user.userId,
        },
        include: { uploader: { select: { id: true, name: true } } },
      });
      return res.status(201).json(attachment);
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  },

  async download(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const attachmentId = parseInt(req.params.attachmentId, 10);
      if (isNaN(reportId) || isNaN(attachmentId)) return res.status(400).json({ error: 'Invalid ID' });

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const user = req.user!;
      if (user.roleName === 'Reporter') {
        const u = await prisma.user.findUnique({ where: { id: user.userId } });
        const canView = report.reportedByUserId === user.userId || (u?.departmentId && report.departmentId === u.departmentId);
        if (!canView) return res.status(403).json({ error: 'Access denied' });
      }

      const attachment = await prisma.reportAttachment.findFirst({ where: { id: attachmentId, reportId } });
      if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

      const filePath = path.resolve(config.uploadDir, attachment.filePath);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.sendFile(filePath);
    } catch (err) {
      console.error('Download error:', err);
      return res.status(500).json({ error: 'Download failed' });
    }
  },
};
