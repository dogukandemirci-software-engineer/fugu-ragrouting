import { promises as fs } from 'fs';
import path from 'path';

// Local-disk document storage. Uploaded file buffers must be persisted somewhere
// durable so failed ingestions can be retried without requiring a re-upload —
// multer's memoryStorage() only holds the buffer for the lifetime of the
// original request, so it must be written out here immediately after upload.
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'documents');

export const StorageService = {
  async save(orgId: string, filename: string, buffer: Buffer): Promise<string> {
    const dir = path.join(STORAGE_ROOT, orgId);
    await fs.mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fullPath = path.join(dir, safeName);
    await fs.writeFile(fullPath, buffer);
    return path.relative(STORAGE_ROOT, fullPath).split(path.sep).join('/');
  },

  async read(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(STORAGE_ROOT, storagePath);
    if (!fullPath.startsWith(STORAGE_ROOT)) {
      throw new Error('Invalid storage path');
    }
    return fs.readFile(fullPath);
  },
};
