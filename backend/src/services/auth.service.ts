import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { pool } from '../config/database';
import { requestContext } from '../config/request-context';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateSecureToken,
} from '../utils/token.util';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { verifyGoogleIdToken } from './google-auth.service';
import { UserPublic } from '../entities/user.entity';
import { query } from '../config/database';
import { AuditLogService } from './audit-log.service';
import { EmailService } from './email.service';
import { AUDIT_ACTIONS } from '../config/constants';

const userRepo = new UserRepository();
const orgRepo = new OrganizationRepository();
const subRepo = new SubscriptionRepository();

// One-time bonus queries granted to both sides of a successful referral signup.
const REFERRAL_BONUS_QUERIES = 500;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResult {
  tokens: AuthTokens;
  user: UserPublic;
  organization_id: string;
}

export const AuthService = {
  async signUp(data: {
    email: string;
    password: string;
    full_name: string;
    organization_name: string;
    referral_code?: string;
  }): Promise<AuthResult> {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists. Please log in.');
    }

    // Referral bonus: both the referring org and the new org get one-time
    // extra monthly queries. Looked up before the transaction so a bad/unknown
    // code never blocks signup — it's a growth nudge, not a requirement.
    const referrer = data.referral_code ? await orgRepo.findBySlug(data.referral_code) : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Run the rest of signup through this transaction's own client (via
      // AsyncLocalStorage, same mechanism orgScopeMiddleware uses per-request)
      // so every repository call here is part of the same transaction — and,
      // once the org exists, subject to the same RLS policy the app enforces
      // everywhere else instead of running on the unscoped pool.
      const { user, org } = await requestContext.run({ client }, async () => {
        const password_hash = await bcrypt.hash(data.password, 12);
        const user = await userRepo.create({
          email: data.email,
          password_hash,
          full_name: data.full_name,
          avatar_url: null,
          email_verified_at: null,
        });

        const slug = await orgRepo.generateUniqueSlug(data.organization_name);
        const org = await orgRepo.create({
          name: data.organization_name,
          slug,
          owner_user_id: user.id,
        });

        // subscriptions is RLS-protected; current_org_id() must be set before
        // this insert or FORCE ROW LEVEL SECURITY rejects it (WITH CHECK sees
        // organization_id = NULL).
        await client.query(`SET LOCAL app.current_org_id = '${org.id}'`);
        await subRepo.create(org.id);

        if (referrer) {
          await subRepo.grantReferralBonus(org.id, REFERRAL_BONUS_QUERIES);
          // Switch RLS scope to the referrer's own org before touching its row —
          // current_org_id() is still set to the new org from above otherwise.
          await client.query(`SET LOCAL app.current_org_id = '${referrer.id}'`);
          await subRepo.grantReferralBonus(referrer.id, REFERRAL_BONUS_QUERIES);
          await client.query(`SET LOCAL app.current_org_id = '${org.id}'`);
        }

        return { user, org };
      });

      await client.query('COMMIT');

      // Send verification email (fire and forget)
      AuthService.sendVerificationEmail(user.id, user.email).catch(() => {});

      const tokens = await AuthService._issueTokens(user.id, org.id, 'owner', user.email);
      const { password_hash: _, ...userPublic } = user;
      return { tokens, user: userPublic, organization_id: org.id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async logIn(data: { email: string; password: string; ip?: string | null; userAgent?: string | null }): Promise<AuthResult> {
    const user = await userRepo.findByEmail(data.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) {
      const orgs = await orgRepo.getUserOrganizations(user.id);
      if (orgs.length > 0) {
        await AuditLogService.logAudit(AUDIT_ACTIONS.AUTH_LOGIN_FAILED, {
          orgId: orgs[0].id,
          actorUserId: user.id,
          resourceType: 'user',
          resourceId: user.id,
          metadata: { email: data.email },
          ip: data.ip,
          userAgent: data.userAgent,
        });
      }
      throw new UnauthorizedError('Invalid email or password');
    }

    const orgs = await orgRepo.getUserOrganizations(user.id);
    if (orgs.length === 0) {
      throw new UnauthorizedError('No organization found for this user');
    }

    const org = orgs[0];
    const member = await orgRepo.getMember(org.id, user.id);
    const tokens = await AuthService._issueTokens(user.id, org.id, member?.role ?? 'member', user.email);
    const { password_hash: _, ...userPublic } = user;
    return { tokens, user: userPublic, organization_id: org.id };
  },

  async refresh(refreshToken: string, ip?: string | null, userAgent?: string | null): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await query<{ user_id: string; revoked_at: Date | null }>(
      'SELECT user_id, revoked_at FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );

    if (!stored.length || stored[0].revoked_at) {
      const orgs = await orgRepo.getUserOrganizations(payload.sub);
      if (orgs.length > 0) {
        await AuditLogService.logAudit(AUDIT_ACTIONS.AUTH_REFRESH_FAILED, {
          orgId: orgs[0].id,
          actorUserId: payload.sub,
          resourceType: 'refresh_token',
          metadata: { reused_or_expired: true },
          ip,
          userAgent,
        });
      }
      throw new UnauthorizedError('Refresh token revoked or expired');
    }

    // Rotate: revoke old, issue new
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);

    const user = await userRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedError('User not found');

    const orgs = await orgRepo.getUserOrganizations(user.id);
    const org = orgs[0];
    const member = await orgRepo.getMember(org.id, user.id);

    return AuthService._issueTokens(user.id, org.id, member?.role ?? 'member', user.email);
  },

  async listMyOrganizations(userId: string) {
    return orgRepo.getUserOrganizations(userId);
  },

  // Login/refresh always default to the user's oldest org (orgs[0]) — a user
  // who belongs to multiple orgs (e.g. just accepted a team invite to a
  // newer org) has no other way to get a JWT scoped to that org otherwise.
  async switchOrg(userId: string, orgId: string): Promise<AuthResult> {
    const member = await orgRepo.getMember(orgId, userId);
    if (!member || !member.joined_at) {
      throw new UnauthorizedError('Not a member of this organization');
    }

    const user = await userRepo.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');

    const tokens = await AuthService._issueTokens(userId, orgId, member.role, user.email);
    const { password_hash: _, ...userPublic } = user;
    return { tokens, user: userPublic, organization_id: orgId };
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
  },

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    await query(
      `INSERT INTO email_verifications (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [userId, tokenHash]
    );
    await EmailService.sendVerification(email, token);
  },

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const rows = await query<{ id: string; user_id: string; used_at: Date | null }>(
      'SELECT * FROM email_verifications WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    if (!rows.length || rows[0].used_at) {
      throw new ValidationError('Invalid or expired verification link');
    }
    await query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [rows[0].id]);
    await userRepo.markEmailVerified(rows[0].user_id);
  },

  async forgotPassword(email: string, ip?: string | null, userAgent?: string | null): Promise<void> {
    const user = await userRepo.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return;

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, tokenHash]
    );

    const orgs = await orgRepo.getUserOrganizations(user.id);
    if (orgs.length > 0) {
      await AuditLogService.logAudit(AUDIT_ACTIONS.AUTH_PASSWORD_RESET_REQUESTED, {
        orgId: orgs[0].id,
        actorUserId: user.id,
        resourceType: 'user',
        resourceId: user.id,
        ip,
        userAgent,
      });
    }
    await EmailService.sendPasswordReset(email, token);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const rows = await query<{ id: string; user_id: string; used_at: Date | null }>(
      'SELECT * FROM password_resets WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    if (!rows.length || rows[0].used_at) {
      throw new ValidationError('Invalid or expired reset link');
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await userRepo.updatePasswordHash(rows[0].user_id, hash);
    await query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [rows[0].id]);
    // Revoke all refresh tokens for security
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [rows[0].user_id]);
  },

  /**
   * Sign in or register via Google ID token (One Tap / OAuth flow).
   * - If user exists by google_id → log in
   * - If user exists by email → link google_id and log in
   * - Otherwise → create new user + org
   */
  async googleAuth(idToken: string): Promise<AuthResult> {
    const googleUser = await verifyGoogleIdToken(idToken);

    // 1. Existing user by google_id
    let user = await userRepo.findByGoogleId(googleUser.sub);

    if (!user) {
      // 2. Existing user by email → link accounts
      user = await userRepo.findByEmail(googleUser.email);
      if (user) {
        await userRepo.setGoogleId(user.id, googleUser.sub, googleUser.picture);
        // Re-fetch to get updated avatar
        user = (await userRepo.findById(user.id))!;
      }
    }

    if (!user) {
      // 3. New user — create user + org in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        user = await userRepo.create({
          email: googleUser.email,
          password_hash: null,
          full_name: googleUser.name,
          avatar_url: googleUser.picture ?? null,
          email_verified_at: new Date(),
        });

        await userRepo.setGoogleId(user.id, googleUser.sub, googleUser.picture);

        const orgName = googleUser.name.split(' ')[0] + "'s Workspace";
        const slug = await orgRepo.generateUniqueSlug(orgName);
        const org = await orgRepo.create({ name: orgName, slug, owner_user_id: user.id });
        await subRepo.create(org.id);

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const orgs = await orgRepo.getUserOrganizations(user!.id);
    const org = orgs[0];
    const member = await orgRepo.getMember(org.id, user!.id);
    const tokens = await AuthService._issueTokens(user!.id, org.id, member?.role ?? 'owner', user!.email);
    const { password_hash: _, ...userPublic } = user!;
    return { tokens, user: userPublic, organization_id: org.id };
  },

  async _issueTokens(userId: string, orgId: string, role: string, email: string): Promise<AuthTokens> {
    const jti = uuidv4();
    const access_token = signAccessToken({ sub: userId, orgId, role, email });
    const refresh_token = signRefreshToken({ sub: userId, jti });

    const tokenHash = hashToken(refresh_token);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [userId, tokenHash]
    );

    return { access_token, refresh_token };
  },
};
