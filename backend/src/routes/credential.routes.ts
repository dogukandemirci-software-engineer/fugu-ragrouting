import { Router } from 'express';
import { CredentialController } from '../controllers/credential.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { requireAuthOrApiKey } from '../middlewares/api-key.middleware';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(requireAuthOrApiKey);
router.use(rateLimitMiddleware);

// API keys are org-scoped, programmatic credentials (equivalent to an
// owner/admin acting on behalf of the org), so they're allowed alongside
// 'owner'/'admin' JWT roles for the mutating BYOK endpoints.
router.get('/', CredentialController.get);
router.get('/models', CredentialController.listModels);
router.put('/', requireRole('owner', 'admin', 'api_key'), CredentialController.save);
router.delete('/', requireRole('owner', 'admin', 'api_key'), CredentialController.remove);

export default router;
