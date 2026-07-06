import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { QueryService } from '../services/query.service';
import { query as dbQuery } from '../config/database';
import { PAGINATION } from '../config/constants';
import { asyncHandler } from '../middlewares/async-handler';

export const QueryController = {
  execute: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const result = await QueryService.execute({
      org_id: req.user!.orgId,
      query: req.body.query,
      strategy: req.body.strategy,
      top_k: req.body.top_k,
      user_id: req.user!.id !== 'api_key' ? req.user!.id : undefined,
    });

    // Signal quota warning in response header so frontend can show QuotaBanner
    if (result.quota.warn) {
      res.setHeader('X-Quota-Warning', 'true');
      res.setHeader('X-Quota-Percent', result.quota.percent.toFixed(2));
    }

    res.json(result);
  }),

  // Server-Sent Events: streams the answer token-by-token so the UI renders it
  // progressively. Errors before the stream opens go through next() (normal JSON
  // error); errors mid-stream are emitted as a terminal `error` SSE event since
  // headers are already sent and we can't switch to a JSON error response.
  async stream(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    // SSE has bespoke error semantics (write() vs next()) — kept out of asyncHandler.
    let headersSent = false;
    const gen = QueryService.executeStream({
      org_id: req.user!.orgId,
      query: req.body.query,
      strategy: req.body.strategy,
      top_k: req.body.top_k,
      user_id: req.user!.id !== 'api_key' ? req.user!.id : undefined,
    });

    // Abort the LLM stream if the client disconnects mid-answer. Registered
    // before we start iterating and always removed in `finally`.
    const onClose = () => { void gen.return(undefined); };
    req.on('close', onClose);

    // Never write to a socket the client already closed — doing so throws
    // ERR_STREAM_WRITE_AFTER_END and would crash the request.
    const write = (payload: unknown) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
      res.flushHeaders?.();
      headersSent = true;

      for await (const event of gen) {
        write(event);
      }
      if (!res.writableEnded) res.end();
    } catch (err) {
      if (!headersSent) return next(err);
      write({ type: 'error', message: err instanceof Error ? err.message : 'stream failed' });
      if (!res.writableEnded) res.end();
    } finally {
      req.off('close', onClose);
    }
  },

  listLogs: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const offset = parseInt(req.query.offset as string) || 0;

    // Org-scoped, not user-scoped: every member of the org sees every
    // query run within it (a shared team workspace), attributed to its author.
    const logs = await dbQuery(
      `SELECT ql.*, u.full_name AS user_full_name, u.email AS user_email
       FROM query_logs ql
       LEFT JOIN users u ON u.id = ql.user_id
       WHERE ql.organization_id = $1
       ORDER BY ql.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.orgId, limit, offset]
    );

    res.json({ logs });
  }),

  getLog: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const [log] = await dbQuery(
      'SELECT * FROM query_logs WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user!.orgId]
    );
    if (!log) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Query log not found' } }); return; }
    res.json({ log });
  }),
};
