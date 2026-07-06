import { Router } from 'express';
import { QueryController } from '../controllers/query.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireApiKey } from '../middlewares/api-key.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { QueryDto } from '../dto/query/query.dto';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();

// Dashboard query explorer: JWT auth
router.post('/execute', requireAuth, rateLimitMiddleware, validateDto(QueryDto), QueryController.execute);
router.post('/stream', requireAuth, rateLimitMiddleware, validateDto(QueryDto), QueryController.stream);
router.get('/logs', requireAuth, QueryController.listLogs);
router.get('/logs/:id', requireAuth, QueryController.getLog);

// SDK/programmatic: API key auth + rate limiting
router.post('/v1/query', requireApiKey, rateLimitMiddleware, validateDto(QueryDto), QueryController.execute);

export default router;
