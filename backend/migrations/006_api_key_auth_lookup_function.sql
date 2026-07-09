-- API-key authentication runs before the request's org scope is known (we
-- don't know which org a raw key belongs to until we look it up), but
-- api_keys has FORCE ROW LEVEL SECURITY with a tenant_isolation policy keyed
-- on app.current_org_id (see 002_row_level_security.sql). Looked up on the
-- plain, unscoped pool connection, that policy silently returns zero rows
-- for every lookup, making ALL API-key auth (including the pre-existing
-- POST /api/queries/v1/query) fail with 401 regardless of key validity.
--
-- Fix: a SECURITY DEFINER function owned by the table owner (postgres, a
-- superuser that bypasses RLS) performs the hash lookup and returns only
-- the columns the auth bootstrap needs. It takes no user-controlled
-- predicate other than an exact SHA-256 hash match (not attacker-guessable),
-- so this does not reintroduce a cross-tenant read: a caller can only ever
-- resolve the row for the specific key they already possess.
CREATE OR REPLACE FUNCTION find_api_key_by_hash(p_key_hash TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  permissions TEXT[]
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, organization_id, permissions
  FROM api_keys
  WHERE key_hash = p_key_hash
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
$$ LANGUAGE sql STABLE;

REVOKE ALL ON FUNCTION find_api_key_by_hash(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_api_key_by_hash(TEXT) TO fugu_app;

-- Same problem for the "touch last_used_at" write that follows a successful
-- authenticate() call: it also runs before org scope is set, so the bare
-- UPDATE would be silently no-op'd by tenant_isolation's WITH CHECK clause.
-- Scoped to a single row by primary key (the id just resolved via the
-- lookup above), so this can't be used to touch an arbitrary org's key.
CREATE OR REPLACE FUNCTION touch_api_key_last_used(p_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE api_keys SET last_used_at = NOW() WHERE id = p_id;
$$ LANGUAGE sql VOLATILE;

REVOKE ALL ON FUNCTION touch_api_key_last_used(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION touch_api_key_last_used(UUID) TO fugu_app;
