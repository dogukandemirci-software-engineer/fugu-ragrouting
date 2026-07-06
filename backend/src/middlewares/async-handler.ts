import { Response, NextFunction } from 'express';

type Handler<Req> = (req: Req, res: Response, next: NextFunction) => Promise<void>;

// Collapses the repetitive try { ... } catch (err) { next(err) } wrapper
// used by every controller method into a single call.
export function asyncHandler<Req>(handler: Handler<Req>): Handler<Req> {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
