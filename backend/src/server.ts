import { app } from './app';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import { logger } from './utils/logger';

async function start(): Promise<void> {
  // Verify DB connection
  await pool.query('SELECT 1');
  logger.info('Database connected');

  // Connect Redis
  await connectRedis();
  logger.info('Redis connected');

  app.listen(env.PORT, () => {
    logger.info(`FUGU backend running on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
