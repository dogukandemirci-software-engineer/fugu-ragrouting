import { promises as fs } from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Local-disk document storage — legacy read path. New uploads go to S3 (see
// below); documents saved before the S3 migration only exist here, so read()
// falls back to disk when the S3 lookup misses. multer's memoryStorage() only
// holds the buffer for the lifetime of the original request, so it must be
// persisted immediately after upload either way.
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'documents');

const s3Client = new S3Client({ region: env.AWS_REGION });

function bucketName(): string {
  if (!env.S3_DOCUMENTS_BUCKET) throw new Error('S3_DOCUMENTS_BUCKET is not configured');
  return env.S3_DOCUMENTS_BUCKET;
}

async function readLocal(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_ROOT, storagePath);
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error('Invalid storage path');
  }
  return fs.readFile(fullPath);
}

export const StorageService = {
  async save(orgId: string, filename: string, buffer: Buffer): Promise<string> {
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const key = `${orgId}/${safeName}`;
    await s3Client.send(
      new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: buffer })
    );
    return key;
  },

  async read(storagePath: string): Promise<Buffer> {
    try {
      const res = await s3Client.send(
        new GetObjectCommand({ Bucket: bucketName(), Key: storagePath })
      );
      return Buffer.from(await res.Body!.transformToByteArray());
    } catch (err) {
      if (err instanceof NoSuchKey) {
        return readLocal(storagePath);
      }
      throw err;
    }
  },

  async delete(storagePath: string): Promise<void> {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName(), Key: storagePath }));
    } catch (err) {
      logger.warn('Failed to delete document from S3', {
        storagePath,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    // Pre-migration documents may still exist on local disk — best-effort
    // cleanup there too, no error if already absent.
    try {
      await fs.unlink(path.join(STORAGE_ROOT, storagePath));
    } catch {
      // not present on disk — expected for S3-native documents
    }
  },
};
