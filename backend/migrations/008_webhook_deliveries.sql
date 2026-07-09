-- Migration 008: webhook_deliveries — retry/DLQ tracking for webhook dispatch.
-- Previously a failed dispatch was recorded (failure_count++) and dropped;
-- this table lets a background poller retry with exponential backoff before
-- giving up permanently (dead_letter), instead of silently losing the event.

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         JSONB NOT NULL,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'dead_letter')),
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_org_id ON webhook_deliveries (organization_id);
CREATE INDEX idx_webhook_deliveries_poll ON webhook_deliveries (status, next_retry_at) WHERE status = 'pending';

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webhook_deliveries USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id());
