import { pool } from '../config/database';
import { getScopedClient } from '../config/request-context';
import type { PoolClient } from 'pg';

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
