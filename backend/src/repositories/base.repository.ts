import { pool } from '../config/database';
import { getScopedClient } from '../config/request-context';
import type { PoolClient } from 'pg';

// Tables carrying an `organization_id` column. RLS (via getScopedClient's
// app.current_org_id) is the real backstop for these — this list only backs
// assertOrgScoped(), a unit-test-time guard against a mutating repository
// method silently regressing to an unscoped WHERE clause outside the RLS path
// (background workers, migrations) where the app-layer filter is load-bearing.
export const TENANT_SCOPED_TABLES = [
  'documents',
  'document_chunks',
  'query_logs',
  'webhooks',
  'webhook_deliveries',
  'organization_llm_credentials',
  'api_keys',
  'audit_logs',
] as const;

// Test-time helper (not called at runtime): fails a repository unit test if a
// mutating statement (UPDATE/DELETE) against a tenant-scoped table doesn't
// also filter by organization_id in its WHERE clause.
export function assertOrgScoped(sql: string): void {
  const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  const isMutation = /^(update|delete)\b/.test(normalized);
  if (!isMutation) return;

  const touchesTenantTable = TENANT_SCOPED_TABLES.some((t) => normalized.includes(t));
  if (!touchesTenantTable) return;

  if (!/where[\s\S]*organization_id\s*=/.test(normalized)) {
    throw new Error(
      `assertOrgScoped: mutating query against a tenant-scoped table has no organization_id filter:\n${sql}`
    );
  }
}

export abstract class BaseRepository {
  // Uses the current request's org-scoped connection when one is active
  // (set by orgScopeMiddleware via AsyncLocalStorage) so RLS policies apply
  // transparently; falls back to the shared pool outside a request context
  // (background workers, migrations, scripts).
  protected async query<T>(sql: string, values?: unknown[]): Promise<T[]> {
    const client = getScopedClient();
    const result = client ? await client.query(sql, values) : await pool.query(sql, values);
    return result.rows as T[];
  }

  protected async queryOne<T>(sql: string, values?: unknown[]): Promise<T | null> {
    const client = getScopedClient();
    const result = client ? await client.query(sql, values) : await pool.query(sql, values);
    return (result.rows[0] as T) ?? null;
  }

  protected async queryWithClient<T>(client: PoolClient, sql: string, values?: unknown[]): Promise<T[]> {
    const result = await client.query(sql, values);
    return result.rows as T[];
  }

  protected buildSetClause(
    data: Record<string, unknown>,
    startIndex = 1
  ): { clause: string; values: unknown[] } {
    const keys = Object.keys(data);
    const clause = keys.map((k, i) => `"${k}" = $${i + startIndex}`).join(', ');
    return { clause, values: Object.values(data) };
  }
}
