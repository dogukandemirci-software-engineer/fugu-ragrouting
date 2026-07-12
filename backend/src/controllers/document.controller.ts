import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { DocumentIngestionService } from '../services/document-ingestion.service';
import { DocumentRepository } from '../repositories/document.repository';
import { StorageService } from '../services/storage.service';
import { asyncHandler } from '../middlewares/async-handler';

const docRepo = new DocumentRepository();

export const DocumentController = {
  list: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const docs = await docRepo.list(req.user!.orgId, { limit, offset });
    res.json({ documents: docs });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const doc = await docRepo.findById(req.params.id, req.user!.orgId);
    if (!doc) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }); return; }
    res.json({ document: doc });
  }),

  upload: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } }); return; }

    const storagePath = await StorageService.save(req.user!.orgId, file.originalname, file.buffer);

    const docId = await DocumentIngestionService.ingest({
      org_id: req.user!.orgId,
      user_id: req.user!.id !== 'api_key' ? req.user!.id : undefined,
      name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      storage_path: storagePath,
      buffer: file.buffer,
    });

    res.status(202).json({ document_id: docId, status: 'pending' });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const doc = await docRepo.findById(req.params.id, req.user!.orgId);
    await docRepo.delete(req.params.id, req.user!.orgId);
    if (doc) await StorageService.delete(doc.storage_path);
    res.status(204).end();
  }),

  retry: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const retried = await DocumentIngestionService.retry(req.params.id, req.user!.orgId);
    if (!retried) {
      res.status(409).json({
        error: { code: 'NOT_RETRIABLE', message: 'Document is not in a failed or pending state' },
      });
      return;
    }
    res.json({ status: 'pending' });
  }),
};
