import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { attachmentController } from '../controllers/attachments';
import { config } from '../config';

const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`),
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

export const attachmentRoutes = Router({ mergeParams: true });

attachmentRoutes.get('/', attachmentController.list);
attachmentRoutes.post('/', upload.single('file'), attachmentController.upload);
attachmentRoutes.get('/:attachmentId/download', attachmentController.download); // must be before generic :id
