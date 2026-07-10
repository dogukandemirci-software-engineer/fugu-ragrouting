/**
 * Integration test — BYOK credential save → display → delete round-trip.
 * Reproduces the reported bug: "user can save a BYOK key but the Remove
 * button never appears" (i.e. GET /organization/llm-credential returns
 * { credential: null } even after a successful save), and that DELETE works.
 *
 * Requires: running Postgres (fugu DB, migrations applied).
 */

// The save path verifies the key with a real provider call — mock it so the
// test exercises persistence/RLS, not a live LLM.
jest.mock('../../utils/llm-client', () => ({
  callChatLLM: jest.fn().mockResolvedValue('ok'),
}));

import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';

const TS = Date.now();
const TEST_EMAIL = `credtest-${TS}@fugu-test.com`;
const TEST_PASSWORD = 'CredTest123!';

let accessToken: string;
let orgId: string;

function authHeader() {
  return { Authorization: `Bearer ${accessToken}` };
}

beforeAll(async () => {
  const res = await request(app).post('/api/auth/sign-up').send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    full_name: 'Cred Tester',
    organization_name: `CredOrg-${TS}`,
  });
  if (res.status !== 201) throw new Error(`Sign-up failed: ${JSON.stringify(res.body)}`);
  accessToken = res.body.tokens.access_token;
  orgId = res.body.organization_id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM organization_llm_credentials WHERE organization_id = $1`, [orgId]);
  await pool.query(`DELETE FROM organization_members WHERE organization_id = $1`, [orgId]);
  await pool.query(`DELETE FROM subscriptions WHERE organization_id = $1`, [orgId]);
  await pool.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_EMAIL]);
  await pool.end();
});

describe('BYOK credential CRUD round-trip', () => {
  it('saves a credential', async () => {
    const res = await request(app)
      .put('/api/organization/llm-credential')
      .set(authHeader())
      .send({ provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-test-1234567890' });
    expect(res.status).toBe(200);
    expect(res.body.credential.provider).toBe('openai');
    expect(res.body.credential.keyLastFour).toBe('7890');
  });

  it('GET returns the saved credential (Remove button precondition)', async () => {
    const res = await request(app).get('/api/organization/llm-credential').set(authHeader());
    expect(res.status).toBe(200);
    // The frontend renders the "Remove" button only when this is non-null.
    expect(res.body.credential).not.toBeNull();
    expect(res.body.credential?.model).toBe('gpt-4o-mini');
  });

  it('deletes the credential and GET then returns null', async () => {
    const del = await request(app).delete('/api/organization/llm-credential').set(authHeader());
    expect(del.status).toBe(204);

    const after = await request(app).get('/api/organization/llm-credential').set(authHeader());
    expect(after.status).toBe(200);
    expect(after.body.credential).toBeNull();
  });
});
