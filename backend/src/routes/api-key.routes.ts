import { Router } from 'express';
import { ApiKeyController } from '../controllers/api-key.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { CreateApiKeyDto } from '../dto/api-key/api-key.dto';

const router = Router();

router.use(requireAuth);
router.get('/', ApiKeyController.list);
router.post('/', validateDto(CreateApiKeyDto), ApiKeyController.create);
router.delete('/:id', ApiKeyController.revoke);

export default router;
