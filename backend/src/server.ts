import { app } from './app';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startIngestionConsumer, enqueueIngestion, enqueueDlq, IngestMessage } from './queue/ingestion-queue';
import { DocumentIngestionService } from './services/document-ingestion.service';

async function handleIngestMessage(msg: IngestMessage): Promise<void> {
  try {
    await DocumentIngestionService.processDocument(msg.docId, msg.orgId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (msg.attempt < env.INGESTION_MAX_ATTEMPTS) {
      logger.warn('Ingestion attempt failed, re-enqueueing', { docId: msg.docId, attempt: msg.attempt, error });
      await enqueueIngestion({ ...msg, attempt: msg.attempt + 1 });
    } else {
      logger.error('Ingestion exhausted retries, sending to DLQ', { docId: msg.docId, attempts: msg.attempt, error });
      await enqueueDlq(msg, error);
    }
    // Never rethrow: the message is handled (re-enqueued or dead-lettered),
    // so the offset must commit — otherwise kafkajs would redeliver it on top.
  }
}

async function start(): Promise<void> {
  // Verify DB connection
  await pool.query('SELECT 1');
  logger.info('Database connected');

  // Connect Redis
  await connectRedis();
  logger.info('Redis connected');

  if (env.INGESTION_QUEUE_ENABLED) {
    // Non-fatal: without the broker, uploads fall back to in-process processing.
    startIngestionConsumer(handleIngestMessage).catch((err) => {
      logger.warn('Ingestion queue consumer unavailable, uploads will process in-process', {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }

  app.listen(env.PORT, () => {
    logger.info(`FUGU backend running on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
