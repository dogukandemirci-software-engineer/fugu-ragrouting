import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { RATE_LIMIT } from '../config/constants';
import { RateLimitError } from '../utils/errors';
import { AuthRequest } from './auth.middleware';

export async function rateLimitMiddleware(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const key = req.user?.orgId ?? req.ip ?? 'anon';
  const redisKey = `${RATE_LIMIT.SLIDING_WINDOW_KEY_PREFIX}${key}`;

  try {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.WINDOW_MS;

    // Sliding window log using Redis sorted set
    const pipeline = redis.multi();
    pipeline.zRemRangeByScore(redisKey, '-inf', windowStart.toString());
    pipeline.zAdd(redisKey, [{ score: now, value: `${now}-${Math.random()}` }]);
    pipeline.zCard(redisKey);
    pipeline.expire(redisKey, Math.ceil(RATE_LIMIT.WINDOW_MS / 1000));

    const results = await pipeline.exec();
    const count = results?.[2] as number ?? 0;

    if (count > RATE_LIMIT.MAX_REQUESTS) {
      return next(new RateLimitError());
    }
  } catch {
    // Redis unavailable → fail open (don't block requests due to rate limiter being down)
  }

  next();
}
