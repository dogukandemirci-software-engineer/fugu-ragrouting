import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { QueryService } from '../services/query.service';
import { query as dbQuery } from '../config/database';
import { PAGINATION } from '../config/constants';

export const QueryController = {
  async execute(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (err) {
      next(err);
    }
  },

  async listLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await dbQuery(
        `SELECT * FROM query_logs
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user!.orgId, limit, offset]
      );

      res.json({ logs });
    } catch (err) {
      next(err);
    }
  },

  async getLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [log] = await dbQuery(
        'SELECT * FROM query_logs WHERE id = $1 AND organization_id = $2',
        [req.params.id, req.user!.orgId]
      );
      if (!log) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Query log not found' } }); return; }
      res.json({ log });
    } catch (err) {
      next(err);
    }
  },
};
