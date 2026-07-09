import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requestContext } from '../config/request-context';
import { AuthRequest } from './auth.middleware';

// Runs after requireAuth/requireApiKey (both set req.user.orgId). Checks out
// a single connection for the lifetime of the request, sets the Postgres
// session GUC RLS policies read (app.current_org_id), and runs the rest of
// the request inside that connection's transaction so every repository call
// — unchanged, via BaseRepository reading the ALS context — is subject to
// row-level security for this org. The transaction is read-only from RLS's
// perspective (SET LOCAL) but statements still commit normally; it exists
// only to scope SET LOCAL to this request instead of leaking across pooled
// connections.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function orgScopeMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.orgId) return next();
  // SET LOCAL cannot be parameterized; only proceed with a value that is
  // provably a UUID (never raw user input — orgId always comes from a
  // verified JWT or an authenticated API key lookup) before splicing it in.
  if (!UUID_RE.test(req.user.orgId)) return next(new Error('Invalid organization id'));

  const client = await pool.connect();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    client.release();
  };

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_org_id = '${req.user.orgId}'`);
  } catch (err) {
    release();
    return next(err);
  }

  // COMMIT must happen before the response is flushed to the client —
  // committing on the 'finish' event is too late, since callers (and tests)
  // can observe the response and issue a follow-up request on a different
  // pooled connection before that async COMMIT has actually landed, causing
  // them to read pre-commit state. Instead, wrap res.end so the transaction
  // is committed synchronously as part of ending the response.
  let settled = false;
  const originalEnd = res.end.bind(res);
  res.end = ((...args: Parameters<Response['end']>) => {
    if (settled) return originalEnd(...args);
    settled = true;
    client
      .query('COMMIT')
      .catch(() => {
        // connection likely already broken; nothing more to do
      })
      .finally(() => {
        release();
        originalEnd(...args);
      });
    return res;
  }) as Response['end'];

  res.on('close', async () => {
    if (settled) return;
    settled = true;
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    } finally {
      release();
    }
  });

  requestContext.run({ client }, () => next());
}
