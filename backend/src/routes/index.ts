import { Router } from 'express';
import authRoutes from './auth.routes';
import apiKeyRoutes from './api-key.routes';
import documentRoutes from './document.routes';
import queryRoutes from './query.routes';
import teamRoutes from './team.routes';
import billingRoutes from './billing.routes';
import webhookRoutes from './webhook.routes';
import accountRoutes from './account.routes';
import credentialRoutes from './credential.routes';
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
router.use('/account', auditLogMiddleware as any, accountRoutes);
router.use('/organization/llm-credential', auditLogMiddleware as any, credentialRoutes);

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
      `SELECT al.id, al.action, al.metadata, al.created_at,
              u.full_name AS actor_full_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.organization_id = $1 ORDER BY al.created_at DESC LIMIT 20`,
      [req.user!.orgId]
    );
    res.json({ notifications: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
