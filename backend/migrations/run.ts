import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Migrations run as the superuser (CREATE ROLE, ALTER DEFAULT PRIVILEGES
// require it), not the app's RLS-scoped fugu_app role — see database.ts and
// 002_row_level_security.sql. Falls back to DATABASE_URL if unset so this
// still works before migration 002 introduces the split.
const migrationsPool = new Pool({
  connectionString: process.env.MIGRATIONS_DATABASE_URL ?? process.env.DATABASE_URL,
});

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname);
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await migrationsPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of sqlFiles) {
      const version = file.replace('.sql', '');
      const existing = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (existing.rows.length > 0) {
        console.log(`⏭  Skipping ${version} (already applied)`);
        continue;
      }

      console.log(`▶  Applying ${version}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );
      await client.query('COMMIT');
      console.log(`✅ Applied ${version}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await migrationsPool.end();
  }
}

runMigrations();
