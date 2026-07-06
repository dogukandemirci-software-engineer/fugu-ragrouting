import { Router } from 'express';
import { ApiKeyController } from '../controllers/api-key.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { CreateApiKeyDto } from '../dto/api-key/api-key.dto';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();

router.use(requireAuth);
router.use(rateLimitMiddleware);
router.get('/', ApiKeyController.list);
router.post('/', validateDto(CreateApiKeyDto), ApiKeyController.create);
router.delete('/:id', ApiKeyController.revoke);

export default router;
