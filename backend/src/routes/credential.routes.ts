import { Router } from 'express';
import { CredentialController } from '../controllers/credential.controller';
import { requireRole } from '../middlewares/auth.middleware';
import { requireAuthOrApiKey, requirePermission } from '../middlewares/api-key.middleware';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(requireAuthOrApiKey);
router.use(rateLimitMiddleware);

// API keys are allowed on the mutating BYOK endpoints alongside 'owner'/
// 'admin' JWT roles, but only if the specific key was minted with 'write'
// permission — requirePermission is a no-op for JWT callers (governed by
// requireRole instead) and enforces scope only for role === 'api_key', so a
// read-only key can't swap or delete the org's paid LLM credential.
router.get('/', CredentialController.get);
router.get('/models', CredentialController.listModels);
router.put('/', requireRole('owner', 'admin', 'api_key'), requirePermission('write'), CredentialController.save);
router.delete('/', requireRole('owner', 'admin', 'api_key'), requirePermission('write'), CredentialController.remove);

export default router;
