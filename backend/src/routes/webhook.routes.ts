import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { CreateWebhookDto } from '../dto/webhook/webhook.dto';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(requireAuth);
router.use(rateLimitMiddleware);

router.get('/', WebhookController.list);
router.post('/', validateDto(CreateWebhookDto), WebhookController.create);
router.delete('/:id', WebhookController.delete);

export default router;
