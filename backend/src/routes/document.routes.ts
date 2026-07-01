import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller';
import { requireAuth } from '../middlewares/auth.middleware';

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
router.use(requireAuth);

router.get('/', DocumentController.list);
router.get('/:id', DocumentController.getById);
router.post('/', upload.single('file'), DocumentController.upload);
router.delete('/:id', DocumentController.delete);
router.post('/:id/retry', DocumentController.retry);

export default router;
