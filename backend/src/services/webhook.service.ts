import crypto from 'crypto';
import { BaseRepository } from '../repositories/base.repository';
import { Webhook, WebhookPublic } from '../entities/webhook.entity';
import { hashToken, generateSecureToken } from '../utils/token.util';
import { logger } from '../utils/logger';

class WebhookRepository extends BaseRepository {
  async list(orgId: string): Promise<WebhookPublic[]> {
    return this.query<WebhookPublic>(
      `SELECT id, organization_id, created_by, name, url, events, active,
              last_triggered_at, failure_count, created_at, updated_at
       FROM webhooks WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
  }

  async create(data: Omit<Webhook, 'id' | 'last_triggered_at' | 'failure_count' | 'created_at' | 'updated_at'>): Promise<WebhookPublic> {
    const wh = await this.queryOne<WebhookPublic>(
      `INSERT INTO webhooks (organization_id, created_by, name, url, secret_hash, events)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.organization_id, data.created_by, data.name, data.url, data.secret_hash, data.events]
    );
    return wh!;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.query('DELETE FROM webhooks WHERE id = $1 AND organization_id = $2', [id, orgId]);
  }

  async findActiveByEvent(event: string): Promise<Webhook[]> {
    return this.query<Webhook>(
      `SELECT * FROM webhooks WHERE active = true AND $1 = ANY(events)`,
      [event]
    );
  }

  async recordFailure(id: string): Promise<void> {
    await this.query(
      'UPDATE webhooks SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  async recordSuccess(id: string): Promise<void> {
    await this.query(
      'UPDATE webhooks SET last_triggered_at = NOW(), failure_count = 0, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }
}

const repo = new WebhookRepository();

export const WebhookService = {
  async list(orgId: string): Promise<WebhookPublic[]> {
    return repo.list(orgId);
  },

  async create(params: { orgId: string; userId: string; name: string; url: string; events: string[] }): Promise<{ webhook: WebhookPublic; raw_secret: string }> {
    const raw_secret = generateSecureToken(24);
    const secret_hash = hashToken(raw_secret);

    const webhook = await repo.create({
      organization_id: params.orgId,
      created_by: params.userId,
      name: params.name,
      url: params.url,
      secret_hash,
      events: params.events,
      active: true,
    });

    return { webhook, raw_secret };
  },

  async delete(id: string, orgId: string): Promise<void> {
    await repo.delete(id, orgId);
  },

  async dispatch(event: string, payload: unknown): Promise<void> {
    const webhooks = await repo.findActiveByEvent(event);

    for (const wh of webhooks) {
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const signature = crypto
        .createHmac('sha256', wh.secret_hash)
        .update(body)
        .digest('hex');

      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Fugu-Signature': `sha256=${signature}`,
            'X-Fugu-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await repo.recordSuccess(wh.id);
      } catch (err) {
        logger.warn('Webhook delivery failed', { webhookId: wh.id, event, err });
        await repo.recordFailure(wh.id);
      }
    }
  },
};
