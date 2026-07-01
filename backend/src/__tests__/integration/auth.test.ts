/**
 * Integration tests for /api/auth/* endpoints.
 * Requires a running Postgres (fugu DB with migrations applied).
 *
 * AuthService.signUp returns: { tokens: { access_token, refresh_token }, user, organization_id }
 * AuthService.logIn  returns: { tokens: { access_token, refresh_token }, user, organization_id }
 * AuthService.refresh returns: { access_token, refresh_token }
 */
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';

const TS = Date.now();

afterAll(async () => {
  await pool.query(
    `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@fugu-test.com')`
  );
  await pool.query(
    `DELETE FROM email_verifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@fugu-test.com')`
  );
  await pool.query(
    `DELETE FROM organization_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@fugu-test.com')`
  );
  await pool.query(
    `DELETE FROM subscriptions WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'test-%' OR slug LIKE 'dup-%' OR slug LIKE 'login-%' OR slug LIKE 'refresh-%')`
  );
  await pool.query(
    `DELETE FROM organizations WHERE slug LIKE 'test-%' OR slug LIKE 'dup-%' OR slug LIKE 'login-%' OR slug LIKE 'refresh-%'`
  );
  await pool.query(`DELETE FROM users WHERE email LIKE '%@fugu-test.com'`);
  await pool.end();
});

describe('POST /api/auth/sign-up', () => {
  it('creates user and returns tokens + user + org_id', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up')
      .send({
        email: `test-${TS}@fugu-test.com`,
        password: 'SecurePass123!',
        full_name: 'Test User',
        organization_name: 'Test Org',
      });

    expect(res.status).toBe(201);
    expect(res.body.tokens.access_token).toBeDefined();
    expect(res.body.tokens.refresh_token).toBeDefined();
    expect(res.body.user.email).toBe(`test-${TS}@fugu-test.com`);
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.organization_id).toBeDefined();
  });

  it('rejects duplicate email with 409', async () => {
    const email = `dup-${TS}@fugu-test.com`;
    await request(app).post('/api/auth/sign-up').send({
      email,
      password: 'Pass123!',
      full_name: 'Dup User',
      organization_name: 'Dup Org',
    });

    const res = await request(app).post('/api/auth/sign-up').send({
      email,
      password: 'Pass123!',
      full_name: 'Dup User',
      organization_name: 'Dup Org 2',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates required fields — returns 400 on invalid body', async () => {
    const res = await request(app).post('/api/auth/sign-up').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/log-in', () => {
  const email = `login-${TS}@fugu-test.com`;
  const password = 'LoginPass123!';

  beforeAll(async () => {
    const r = await request(app).post('/api/auth/sign-up').send({
      email,
      password,
      full_name: 'Login User',
      organization_name: 'Login Org',
    });
    // Verify signup worked
    if (r.status !== 201) {
      throw new Error(`Setup signup failed: ${r.status} ${JSON.stringify(r.body)}`);
    }
  });

  it('returns tokens on valid credentials', async () => {
    const res = await request(app).post('/api/auth/log-in').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.tokens.access_token).toBeDefined();
    expect(res.body.tokens.refresh_token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/log-in').send({ email, password: 'WrongPass!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/log-in').send({
      email: 'nobody@fugu-test.com',
      password: 'anything',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const r = await request(app).post('/api/auth/sign-up').send({
      email: `refresh-${TS}@fugu-test.com`,
      password: 'RefreshPass123!',
      full_name: 'Refresh User',
      organization_name: 'Refresh Org',
    });
    if (r.status !== 201) {
      throw new Error(`Setup signup failed: ${r.status} ${JSON.stringify(r.body)}`);
    }
    refreshToken = r.body.tokens.refresh_token;
  });

  it('returns new token pair (token rotation)', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.refresh_token).not.toBe(refreshToken);
  });

  it('rejects reuse of rotated old token', async () => {
    // Do a first rotation
    await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    // Try to reuse the original
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(res.status).toBe(401);
  });

  it('rejects garbage token with 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'garbage.token.here' });
    expect(res.status).toBe(401);
  });
});
