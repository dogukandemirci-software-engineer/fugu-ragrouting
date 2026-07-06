import { Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { RATE_LIMIT, AUTH_RATE_LIMIT } from '../config/constants';
import { RateLimitError } from '../utils/errors';
import { AuthRequest } from './auth.middleware';

function makeRateLimiter(
  config: { WINDOW_MS: number; MAX_REQUESTS: number; SLIDING_WINDOW_KEY_PREFIX: string },
  keyOf: (req: AuthRequest) => string
) {
  return async function (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
    const redisKey = `${config.SLIDING_WINDOW_KEY_PREFIX}${keyOf(req)}`;

    try {
      const now = Date.now();
      const windowStart = now - config.WINDOW_MS;

      // Sliding window log using Redis sorted set
      const pipeline = redis.multi();
      pipeline.zRemRangeByScore(redisKey, '-inf', windowStart.toString());
      pipeline.zAdd(redisKey, [{ score: now, value: `${now}-${Math.random()}` }]);
      pipeline.zCard(redisKey);
      pipeline.expire(redisKey, Math.ceil(config.WINDOW_MS / 1000));

      const results = await pipeline.exec();
      const count = (results?.[2] as number) ?? 0;

      if (count > config.MAX_REQUESTS) {
        return next(new RateLimitError());
      }
    } catch {
      // Redis unavailable → fail open (don't block requests due to rate limiter being down)
    }

    next();
  };
}

export const rateLimitMiddleware = makeRateLimiter(RATE_LIMIT, (req) => req.user?.orgId ?? req.ip ?? 'anon');

// IP-keyed, stricter window — guards unauthenticated auth endpoints (login, sign-up,
// forgot-password) against brute-force/credential-stuffing and email-enumeration abuse.
export const authRateLimitMiddleware = makeRateLimiter(AUTH_RATE_LIMIT, (req) => req.ip ?? 'anon');
