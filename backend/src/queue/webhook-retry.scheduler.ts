import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';

const POLL_INTERVAL_MS = 15_000;

let timer: NodeJS.Timeout | null = null;

// In-process interval poller — no separate broker needed (unlike ingestion,
// webhook retries don't need durable cross-restart delivery guarantees at
// this volume; a missed poll just retries on the next tick).
export function startWebhookRetryScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    WebhookService.processDueRetries().catch((err) => {
      logger.error('Webhook retry poll failed', { err: err instanceof Error ? err.message : String(err) });
    });
  }, POLL_INTERVAL_MS);
  timer.unref();
}

export function stopWebhookRetryScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
