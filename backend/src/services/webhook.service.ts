import crypto from 'crypto';
import { BaseRepository } from '../repositories/base.repository';
import { Webhook, WebhookPublic } from '../entities/webhook.entity';
import { hashToken, generateSecureToken } from '../utils/token.util';
import { assertPublicHostname } from '../utils/ssrf-guard.util';
import { ValidationError } from '../utils/errors';
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

  async findById(id: string): Promise<Webhook | null> {
    return this.queryOne<Webhook>('SELECT * FROM webhooks WHERE id = $1', [id]);
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

// Backoff schedule for retry attempts after the initial dispatch failure:
// 30s, 2min, 10min, 30min, then dead_letter. Capped at MAX_ATTEMPTS so a
// permanently-broken endpoint doesn't retry forever.
const RETRY_BACKOFF_SECONDS = [30, 120, 600, 1800];
const MAX_ATTEMPTS = RETRY_BACKOFF_SECONDS.length;

interface PendingDelivery {
  id: string;
  organization_id: string;
  webhook_id: string;
  event: string;
  payload: unknown;
  attempt_count: number;
}

class WebhookDeliveryRepository extends BaseRepository {
  async create(data: { organization_id: string; webhook_id: string; event: string; payload: unknown }): Promise<string> {
    const row = await this.queryOne<{ id: string }>(
      `INSERT INTO webhook_deliveries (organization_id, webhook_id, event, payload)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [data.organization_id, data.webhook_id, data.event, JSON.stringify(data.payload)]
    );
    return row!.id;
  }

  async findDue(limit = 20): Promise<PendingDelivery[]> {
    return this.query<PendingDelivery>(
      `SELECT id, organization_id, webhook_id, event, payload, attempt_count
       FROM webhook_deliveries
       WHERE status = 'pending' AND next_retry_at <= NOW()
       ORDER BY next_retry_at ASC
       LIMIT $1`,
      [limit]
    );
  }

  async markDelivered(id: string): Promise<void> {
    await this.query(`UPDATE webhook_deliveries SET status = 'delivered', updated_at = NOW() WHERE id = $1`, [id]);
  }

  async scheduleRetry(id: string, attemptCount: number, error: string): Promise<void> {
    const delaySeconds = RETRY_BACKOFF_SECONDS[Math.min(attemptCount, RETRY_BACKOFF_SECONDS.length - 1)];
    await this.query(
      `UPDATE webhook_deliveries
       SET attempt_count = $2, next_retry_at = NOW() + ($3 || ' seconds')::interval,
           last_error = $4, updated_at = NOW()
       WHERE id = $1`,
      [id, attemptCount, delaySeconds, error]
    );
  }

  async markDeadLetter(id: string, error: string): Promise<void> {
    await this.query(
      `UPDATE webhook_deliveries SET status = 'dead_letter', last_error = $2, updated_at = NOW() WHERE id = $1`,
      [id, error]
    );
  }
}

const repo = new WebhookRepository();
const deliveryRepo = new WebhookDeliveryRepository();

// Shared by the first dispatch attempt and the retry poller: re-validates the
// hostname (DNS can change between calls — rebinding defense) and POSTs the
// signed payload. Returns null on success, or the error message on failure.
async function attemptDelivery(webhookUrl: string, secretHash: string, event: string, payload: unknown): Promise<string | null> {
  try {
    await assertPublicHostname(webhookUrl);

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = crypto.createHmac('sha256', secretHash).update(body).digest('hex');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fugu-Signature': `sha256=${signature}`,
        'X-Fugu-Event': event,
      },
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export const WebhookService = {
  async list(orgId: string): Promise<WebhookPublic[]> {
    return repo.list(orgId);
  },

  async create(params: { orgId: string; userId: string; name: string; url: string; events: string[] }): Promise<{ webhook: WebhookPublic; raw_secret: string }> {
    try {
      await assertPublicHostname(params.url);
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Invalid webhook URL');
    }

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
      const error = await attemptDelivery(wh.url, wh.secret_hash, event, payload);

      if (!error) {
        await repo.recordSuccess(wh.id);
        continue;
      }

      logger.warn('Webhook delivery failed, scheduling retry', { webhookId: wh.id, event, error });
      await repo.recordFailure(wh.id);
      await deliveryRepo.create({
        organization_id: wh.organization_id,
        webhook_id: wh.id,
        event,
        payload,
      });
    }
  },

  // Polled on an interval by the retry scheduler (see webhook-retry.scheduler.ts).
  // Re-validates the hostname on every retry (defends DNS rebinding across
  // time, same as the first attempt) and dead-letters after MAX_ATTEMPTS.
  async processDueRetries(): Promise<void> {
    const due = await deliveryRepo.findDue();

    for (const delivery of due) {
      const webhook = await repo.findById(delivery.webhook_id);
      if (!webhook || !webhook.active) {
        await deliveryRepo.markDeadLetter(delivery.id, 'Webhook deleted or deactivated');
        continue;
      }

      const error = await attemptDelivery(webhook.url, webhook.secret_hash, delivery.event, delivery.payload);

      if (!error) {
        await deliveryRepo.markDelivered(delivery.id);
        await repo.recordSuccess(webhook.id);
        continue;
      }

      const nextAttempt = delivery.attempt_count + 1;
      if (nextAttempt >= MAX_ATTEMPTS) {
        logger.error('Webhook delivery exhausted retries, dead-lettering', { deliveryId: delivery.id, error });
        await deliveryRepo.markDeadLetter(delivery.id, error);
      } else {
        await deliveryRepo.scheduleRetry(delivery.id, nextAttempt, error);
      }
    }
  },
};
