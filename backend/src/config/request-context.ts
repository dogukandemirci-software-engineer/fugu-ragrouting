import { AsyncLocalStorage } from 'async_hooks';
import type { PoolClient } from 'pg';
import { pool } from './database';

// Carries the current request's org-scoped DB client through any async call
// chain without threading it through every service/repository method
// signature. Set once per HTTP request by orgScopeMiddleware; read by
// BaseRepository so existing repository code needs no changes to become
// RLS-scoped. Falls back to the shared pool (see database.ts) outside a
// request context — background workers, migrations, scripts.
export const requestContext = new AsyncLocalStorage<{ client: PoolClient }>();

export function getScopedClient(): PoolClient | null {
  return requestContext.getStore()?.client ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same mechanism orgScopeMiddleware uses per-request, but for code with no
// HTTP request at all — Kafka consumers, cron jobs, scripts. Without this,
// BaseRepository falls back to the unscoped pool, current_org_id() is NULL,
// and RLS-protected tables (documents, subscriptions, etc.) silently return
// zero rows / reject writes instead of erroring loudly.
export async function runInOrgScope<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  if (!UUID_RE.test(orgId)) {
    throw new Error('Invalid organization id for org-scoped operation');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_org_id = '${orgId}'`);
    const result = await requestContext.run({ client }, fn);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
