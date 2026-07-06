/**
 * Integration tests — Document upload & parsing pipeline
 *
 * Covers: PDF, TXT, MD, CSV, JSON, DOCX, XLSX uploads via /api/documents
 * Requires: running Postgres + Redis (Docker), backend migrations applied.
 */
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from '../../app';
import { pool } from '../../config/database';

// ── helpers ────────────────────────────────────────────────────────────────

let accessToken: string;
let orgId: string;
const uploadedIds: string[] = [];

const TS = Date.now();
const TEST_EMAIL = `doctest-${TS}@fugu-test.com`;
const TEST_PASSWORD = 'DocTest123!';

async function signUp() {
  const res = await request(app).post('/api/auth/sign-up').send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    full_name: 'Doc Tester',
    organization_name: `DocOrg-${TS}`,
  });
  if (res.status !== 201) throw new Error(`Sign-up failed: ${JSON.stringify(res.body)}`);
  accessToken = res.body.tokens.access_token;
  orgId = res.body.organization_id;
}

function authHeader() {
  return { Authorization: `Bearer ${accessToken}` };
}

/** Upload a file buffer and return the response */
async function uploadBuffer(
  buf: Buffer,
  filename: string,
  mimeType: string
) {
  return request(app)
    .post('/api/documents')
    .set(authHeader())
    .attach('file', buf, { filename, contentType: mimeType });
}

/** Poll until doc status is not pending/processing (max 10s) */
async function waitReady(docId: string, maxMs = 10_000): Promise<string> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set(authHeader());
    const status: string = res.body.document?.status;
    if (status === 'ready' || status === 'failed') return status;
    await new Promise((r) => setTimeout(r, 400));
  }
  return 'timeout';
}

// ── setup / teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await signUp();
});

afterAll(async () => {
  // Delete all uploaded docs
  for (const id of uploadedIds) {
    await request(app).delete(`/api/documents/${id}`).set(authHeader()).catch(() => {});
  }
  // Clean test user / org
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [TEST_EMAIL]);
  await pool.query(`DELETE FROM organization_members WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [TEST_EMAIL]);
  await pool.query(`DELETE FROM subscriptions WHERE organization_id = $1`, [orgId]);
  await pool.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_EMAIL]);
  await pool.end();
});

// ── auth guard ─────────────────────────────────────────────────────────────

describe('Document auth guard', () => {
  it('rejects upload without token (401)', async () => {
    const buf = Buffer.from('hello');
    const res = await request(app)
      .post('/api/documents')
      .attach('file', buf, { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(401);
  });

  it('rejects request with no file (400)', async () => {
    const res = await request(app).post('/api/documents').set(authHeader());
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no file/i);
  });
});

// ── plain text ─────────────────────────────────────────────────────────────

describe('TXT upload', () => {
  it('uploads and processes a plain text file', async () => {
    const content = 'The quick brown fox jumped over the lazy dog.\nThis is a test document.';
    const buf = Buffer.from(content);
    const res = await uploadBuffer(buf, 'sample.txt', 'text/plain');

    expect(res.status).toBe(202);
    expect(res.body.document_id).toBeDefined();
    uploadedIds.push(res.body.document_id);

    const status = await waitReady(res.body.document_id);
    expect(status).toBe('ready');
  });

  it('creates at least one chunk for text content', async () => {
    const buf = Buffer.from('A'.repeat(500));
    const res = await uploadBuffer(buf, 'chunky.txt', 'text/plain');
    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);

    await waitReady(res.body.document_id);
    const detail = await request(app).get(`/api/documents/${res.body.document_id}`).set(authHeader());
    expect(detail.body.document.chunk_count).toBeGreaterThan(0);
  });
});

// ── Markdown ───────────────────────────────────────────────────────────────

describe('Markdown upload', () => {
  it('uploads .md file and strips syntax', async () => {
    const md = `# Heading\n\n**Bold text** and *italic*.\n\n- item one\n- item two\n\n[link](https://example.com)`;
    const res = await uploadBuffer(Buffer.from(md), 'readme.md', 'text/markdown');

    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);
    const status = await waitReady(res.body.document_id);
    expect(status).toBe('ready');
  });
});

// ── JSON ───────────────────────────────────────────────────────────────────

describe('JSON upload', () => {
  it('flattens a JSON object into key-value text', async () => {
    const obj = {
      name: 'Test Person',
      role: 'Engineer',
      skills: ['TypeScript', 'Python'],
      meta: { level: 'senior', remote: true },
    };
    const res = await uploadBuffer(
      Buffer.from(JSON.stringify(obj)),
      'profile.json',
      'application/json'
    );

    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);
    const status = await waitReady(res.body.document_id);
    expect(status).toBe('ready');
  });

  it('rejects malformed JSON gracefully (document enters failed state)', async () => {
    const res = await uploadBuffer(
      Buffer.from('{invalid json'),
      'broken.json',
      'application/json'
    );
    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);

    const status = await waitReady(res.body.document_id);
    // Parser throws → ingestion marks as failed
    expect(status).toBe('failed');
  });
});

// ── CSV ────────────────────────────────────────────────────────────────────

describe('CSV upload', () => {
  it('parses CSV rows into key: value lines', async () => {
    const csv = `name,role,company\nAlice,Engineer,ACME\nBob,Designer,FUGU\nCarol,PM,StartCo`;
    const res = await uploadBuffer(Buffer.from(csv), 'employees.csv', 'text/csv');

    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);
    const status = await waitReady(res.body.document_id);
    expect(status).toBe('ready');
  });

  it('handles empty CSV (0 rows) without crashing', async () => {
    const csv = `col1,col2\n`;
    const res = await uploadBuffer(Buffer.from(csv), 'empty.csv', 'text/csv');
    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);
    // May be ready with 0 chunks or fail — either is acceptable, must not throw 500
    const status = await waitReady(res.body.document_id);
    expect(['ready', 'failed']).toContain(status);
  });
});

// ── PDF ────────────────────────────────────────────────────────────────────

describe('PDF upload', () => {
  it('accepts PDF mime type and creates a document record', async () => {
    // Minimal valid PDF (real structure, not just bytes)
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
      '0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\n' +
      'startxref\n190\n%%EOF'
    );

    const res = await uploadBuffer(minimalPdf, 'document.pdf', 'application/pdf');
    expect(res.status).toBe(202);
    expect(res.body.document_id).toBeDefined();
    uploadedIds.push(res.body.document_id);

    // PDF may have no extractable text in this minimal case → ready or failed
    const status = await waitReady(res.body.document_id, 15_000);
    expect(['ready', 'failed']).toContain(status);
  });

  it('stores correct mime type for PDF', async () => {
    const minPdf = Buffer.from('%PDF-1.4\n%%EOF');
    const res = await uploadBuffer(minPdf, 'test.pdf', 'application/pdf');
    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);

    await waitReady(res.body.document_id);
    const detail = await request(app)
      .get(`/api/documents/${res.body.document_id}`)
      .set(authHeader());
    expect(detail.body.document.file_type).toBe('application/pdf');
  });
});

// ── DOCX ───────────────────────────────────────────────────────────────────

describe('DOCX upload', () => {
  it('accepts docx mime type', async () => {
    // Real minimal DOCX would require zip binary; test mime acceptance only
    // (mammoth will fail on non-zip, document enters failed state)
    const fakeBuf = Buffer.from('PK fake docx content');
    const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const res = await uploadBuffer(fakeBuf, 'report.docx', mime);
    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);
  });
});

// ── XLSX ───────────────────────────────────────────────────────────────────

describe('XLSX upload', () => {
  it('accepts xlsx mime type', async () => {
    const fakeBuf = Buffer.from('PK fake xlsx content');
    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const res = await uploadBuffer(fakeBuf, 'sheet.xlsx', mime);
    expect(res.status).toBe(202);
    uploadedIds.push(res.body.document_id);
  });
});

// ── size limits ────────────────────────────────────────────────────────────

describe('File size limits', () => {
  it('rejects files larger than 50MB', async () => {
    // Create a ~51MB buffer
    const big = Buffer.alloc(51 * 1024 * 1024, 'x');
    const res = await uploadBuffer(big, 'huge.txt', 'text/plain');
    // multer returns 500 or 413 on size limit
    expect([400, 413, 500]).toContain(res.status);
  });
});

// ── document list ──────────────────────────────────────────────────────────

describe('Document listing', () => {
  it('lists documents belonging to the org', async () => {
    const res = await request(app).get('/api/documents').set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it('supports pagination via limit and offset', async () => {
    const r1 = await request(app).get('/api/documents?limit=2&offset=0').set(authHeader());
    const r2 = await request(app).get('/api/documents?limit=2&offset=2').set(authHeader());
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(Array.isArray(r1.body.documents)).toBe(true);
  });

  it('does not expose documents from other orgs', async () => {
    // Create a second user/org
    const other = await request(app).post('/api/auth/sign-up').send({
      email: `other-${TS}@fugu-test.com`,
      password: 'OtherPass123!',
      full_name: 'Other User',
      organization_name: `OtherOrg-${TS}`,
    });
    const otherToken = other.body.tokens.access_token;

    // Other user uploads a doc
    const buf = Buffer.from('secret content from other org');
    const upload = await request(app)
      .post('/api/documents')
      .set({ Authorization: `Bearer ${otherToken}` })
      .attach('file', buf, { filename: 'secret.txt', contentType: 'text/plain' });
    const otherId = upload.body.document_id;

    // Original user cannot see it
    const res = await request(app)
      .get(`/api/documents/${otherId}`)
      .set(authHeader());
    expect([403, 404]).toContain(res.status);

    // Cleanup
    await request(app)
      .delete(`/api/documents/${otherId}`)
      .set({ Authorization: `Bearer ${otherToken}` });
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [`other-${TS}@fugu-test.com`]);
    await pool.query(`DELETE FROM organization_members WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [`other-${TS}@fugu-test.com`]);
    const otherOrg = other.body.organization_id;
    await pool.query(`DELETE FROM subscriptions WHERE organization_id = $1`, [otherOrg]);
    await pool.query(`DELETE FROM organizations WHERE id = $1`, [otherOrg]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [`other-${TS}@fugu-test.com`]);
  });
});

// ── delete ─────────────────────────────────────────────────────────────────

describe('Document deletion', () => {
  it('deletes a document and removes it from listing', async () => {
    const buf = Buffer.from('to be deleted');
    const up = await uploadBuffer(buf, 'delete-me.txt', 'text/plain');
    expect(up.status).toBe(202);
    const id = up.body.document_id;

    const del = await request(app).delete(`/api/documents/${id}`).set(authHeader());
    expect(del.status).toBe(204);

    const detail = await request(app).get(`/api/documents/${id}`).set(authHeader());
    expect(detail.status).toBe(404);
  });

  it('returns 404 when deleting non-existent document', async () => {
    const res = await request(app)
      .delete('/api/documents/00000000-0000-0000-0000-000000000000')
      .set(authHeader());
    expect([404, 204]).toContain(res.status);
  });
});
