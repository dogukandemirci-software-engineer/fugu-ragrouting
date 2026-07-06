import { Pool } from 'pg';
import { env } from './env';
import { getScopedClient } from './request-context';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

// Prefers the current request's org-scoped connection (see
// org-scope.middleware.ts) so RLS policies apply; falls back to the shared
// pool outside a request context.
export async function query<T = Record<string, unknown>>(
  sql: string,
  values?: unknown[]
): Promise<T[]> {
  const client = getScopedClient();
  const result = client ? await client.query(sql, values) : await pool.query(sql, values);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  values?: unknown[]
): Promise<T | null> {
  const client = getScopedClient();
  const result = client ? await client.query(sql, values) : await pool.query(sql, values);
  return (result.rows[0] as T) ?? null;
}

export async function withTransaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
