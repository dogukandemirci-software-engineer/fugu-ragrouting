import { Kafka, Producer, logLevel } from 'kafkajs';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const INGEST_TOPIC = 'document.ingest';
export const INGEST_DLQ_TOPIC = 'document.ingest.dlq';

export interface IngestMessage {
  docId: string;
  orgId: string;
  attempt: number;
}

const kafka = new Kafka({
  clientId: 'fugu-backend',
  brokers: env.KAFKA_BROKERS.split(',').map((b) => b.trim()),
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 3 },
});

let producer: Producer | null = null;

async function getProducer(): Promise<Producer> {
  if (!producer) {
    const p = kafka.producer({ allowAutoTopicCreation: true });
    await p.connect();
    producer = p;
  }
  return producer;
}

/**
 * Publishes an ingestion job. Throws if the broker is unreachable —
 * callers decide whether to fall back to in-process processing.
 */
export async function enqueueIngestion(msg: IngestMessage): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: INGEST_TOPIC,
    messages: [{ key: msg.docId, value: JSON.stringify(msg) }],
  });
}

export async function enqueueDlq(msg: IngestMessage, error: string): Promise<void> {
  try {
    const p = await getProducer();
    await p.send({
      topic: INGEST_DLQ_TOPIC,
      messages: [{ key: msg.docId, value: JSON.stringify({ ...msg, error, failed_at: new Date().toISOString() }) }],
    });
  } catch (err) {
    logger.error('Failed to publish to DLQ', {
      docId: msg.docId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Starts the ingestion consumer inside this process. At-least-once:
 * offsets commit only after the handler resolves, so a crash/restart
 * mid-processing redelivers the message instead of losing the job.
 * Handler must be idempotent (it wipes existing chunks before rewriting).
 */
export async function startIngestionConsumer(
  handle: (msg: IngestMessage) => Promise<void>
): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'ingestion-workers' });
  await consumer.connect();
  await consumer.subscribe({ topic: INGEST_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      let msg: IngestMessage;
      try {
        msg = JSON.parse(message.value.toString());
      } catch {
        logger.warn('Ingestion queue: unparseable message dropped');
        return;
      }
      if (!msg.docId || !msg.orgId) return;
      await handle(msg);
    },
  });

  logger.info('Ingestion queue consumer running', { topic: INGEST_TOPIC, brokers: env.KAFKA_BROKERS });
}
