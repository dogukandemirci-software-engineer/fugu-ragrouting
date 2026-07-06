-- Tracks whether the 80% quota-warning email has already been sent for a
-- given org's billing period, so we email once per threshold crossing
-- instead of on every request past 80%.
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS warning_email_sent BOOLEAN NOT NULL DEFAULT FALSE;
