import { Router } from 'express';
import { CredentialController } from '../controllers/credential.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(requireAuth);
router.use(rateLimitMiddleware);

router.get('/', CredentialController.get);
router.put('/', requireRole('owner', 'admin'), CredentialController.save);
router.delete('/', requireRole('owner', 'admin'), CredentialController.remove);

export default router;
