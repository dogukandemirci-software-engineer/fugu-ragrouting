-- Migration 002: Row-Level Security (defense-in-depth tenant isolation)
--
-- App-layer WHERE organization_id = $1 filtering (Phase 1 fixes) remains the
-- primary isolation mechanism. RLS is a DB-level backstop: even a repository
-- method that forgets an organization_id filter can no longer return another
-- tenant's rows, because Postgres itself rejects/filters the row.
--
-- Superusers (including the table owner by default) always bypass RLS,
-- FORCE ROW LEVEL SECURITY or not — so a dedicated, non-superuser,
-- NOT BYPASSRLS application role is required for these policies to have any
-- effect. The pool must connect as this role, not as `postgres`.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fugu_app') THEN
    CREATE ROLE fugu_app LOGIN PASSWORD '__FUGU_APP_DB_PASSWORD__' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fugu_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fugu_app;
GRANT USAGE ON SCHEMA ag_catalog TO fugu_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ag_catalog TO fugu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO fugu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO fugu_app;

-- current_org_id() reads the per-request GUC set by orgScopeMiddleware via
-- SET LOCAL app.current_org_id. The `true` (missing_ok) argument makes this
-- return NULL instead of erroring when unset (e.g. a superuser maintenance
-- session), which then correctly matches nothing under the policies below.
CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::UUID
$$ LANGUAGE SQL STABLE;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['api_keys', 'subscriptions', 'usage_counters', 'documents', 'document_chunks', 'query_logs', 'audit_logs', 'webhooks']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I', t
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id())',
      t
    );
  END LOOP;
END
$$;

-- organization_members is intentionally excluded: a user must be able to see
-- their own pending invitations across organizations they are not yet an
-- active member of (GET /api/account/invitations), which has no single
-- current_org_id to scope against. That table relies on the existing
-- app-layer user_id/organization_id filtering (see organization.repository.ts).
