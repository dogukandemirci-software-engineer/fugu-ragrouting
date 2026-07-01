import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { DocumentIngestionService } from '../services/document-ingestion.service';
import { DocumentParserService } from '../services/document-parser.service';
import { DocumentRepository } from '../repositories/document.repository';

const docRepo = new DocumentRepository();

export const DocumentController = {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const docs = await docRepo.list(req.user!.orgId, { limit, offset });
      res.json({ documents: docs });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await docRepo.findById(req.params.id, req.user!.orgId);
      if (!doc) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }); return; }
      res.json({ document: doc });
    } catch (err) {
      next(err);
    }
  },

  async upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } }); return; }

      const parsed = await DocumentParserService.parse(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      const docId = await DocumentIngestionService.ingest({
        org_id: req.user!.orgId,
        user_id: req.user!.id,
        name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        storage_path: `uploads/${req.user!.orgId}/${file.filename ?? file.originalname}`,
        raw_text: parsed.text,
        metadata: parsed.metadata,
      });

      res.status(202).json({ document_id: docId, status: 'pending' });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await docRepo.delete(req.params.id, req.user!.orgId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async retry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await DocumentIngestionService.retry(req.params.id, req.user!.orgId);
      res.json({ status: 'pending' });
    } catch (err) {
      next(err);
    }
  },
};
