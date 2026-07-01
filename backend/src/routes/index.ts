import { Router } from 'express';
import authRoutes from './auth.routes';
import apiKeyRoutes from './api-key.routes';
import documentRoutes from './document.routes';
import queryRoutes from './query.routes';
import teamRoutes from './team.routes';
import billingRoutes from './billing.routes';
import webhookRoutes from './webhook.routes';
import { requireAuth } from '../middlewares/auth.middleware';
import { AuditLogService } from '../services/audit-log.service';
import { auditLogMiddleware } from '../middlewares/audit-log.middleware';
import { query as dbQuery } from '../config/database';

const router = Router();

router.use('/auth', authRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/documents', auditLogMiddleware as any, documentRoutes);
router.use('/queries', queryRoutes);
router.use('/team', auditLogMiddleware as any, teamRoutes);
router.use('/billing', billingRoutes);
router.use('/webhooks', auditLogMiddleware as any, webhookRoutes);

// Audit logs — read-only
router.get('/audit-logs', requireAuth, async (req: any, res, next) => {
  try {
    const logs = await AuditLogService.list(req.user!.orgId, {
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
      action: req.query.action as string | undefined,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// Notifications (MVP: last 20 audit log entries as notifications)
router.get('/notifications', requireAuth, async (req: any, res, next) => {
  try {
    const rows = await dbQuery(
      `SELECT id, action, metadata, created_at FROM audit_logs
       WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user!.orgId]
    );
    res.json({ notifications: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
