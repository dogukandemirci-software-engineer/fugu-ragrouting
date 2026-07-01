import { pool } from '../config/database';
import type { PoolClient } from 'pg';

export abstract class BaseRepository {
  protected async query<T>(sql: string, values?: unknown[]): Promise<T[]> {
    const result = await pool.query(sql, values);
    return result.rows as T[];
  }

  protected async queryOne<T>(sql: string, values?: unknown[]): Promise<T | null> {
    const result = await pool.query(sql, values);
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
