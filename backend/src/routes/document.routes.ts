import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller';
import { requireAuthOrApiKey, requirePermission } from '../middlewares/api-key.middleware';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // xlsx
      'application/vnd.ms-excel',                                                 // xls
      'application/msword',                                                       // doc
    ];
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExts = ['pdf', 'txt', 'md', 'markdown', 'csv', 'json', 'docx', 'xlsx', 'xls'];
    cb(null, allowed.includes(file.mimetype) || allowedExts.includes(ext ?? ''));
  },
});

const router = Router();
router.use(requireAuthOrApiKey);

// Mutating routes require 'write' permission for API-key callers (no-op for
// JWT dashboard sessions) so a read-only integration key can't ingest or
// delete documents.
router.get('/', DocumentController.list);
router.get('/:id', DocumentController.getById);
router.post('/', rateLimitMiddleware, requirePermission('write'), upload.single('file'), DocumentController.upload);
router.delete('/:id', requirePermission('write'), DocumentController.delete);
router.post('/:id/retry', requirePermission('write'), DocumentController.retry);

export default router;
