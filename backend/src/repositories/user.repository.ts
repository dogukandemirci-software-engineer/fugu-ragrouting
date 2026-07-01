import { BaseRepository } from './base.repository';
import { User } from '../entities/user.entity';
import { IUserRepository } from '../interfaces/i-user-repository';

export class UserRepository extends BaseRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return this.queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.queryOne<User>('SELECT * FROM users WHERE email = $1', [email]);
  }

  async create(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const user = await this.queryOne<User>(
      `INSERT INTO users (email, password_hash, full_name, avatar_url, email_verified_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, data.password_hash, data.full_name, data.avatar_url, data.email_verified_at]
    );
    return user!;
  }

  async updatePasswordHash(userId: string, hash: string): Promise<void> {
    await this.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, userId]
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.query(
      'UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.queryOne<User>('SELECT * FROM users WHERE google_id = $1', [googleId]);
  }

  async setGoogleId(userId: string, googleId: string, avatarUrl?: string): Promise<void> {
    await this.query(
      `UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url),
       email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $3`,
      [googleId, avatarUrl ?? null, userId]
    );
  }

  async updateProfile(
    userId: string,
    data: Partial<Pick<User, 'full_name' | 'avatar_url'>>
  ): Promise<User> {
    const { clause, values } = this.buildSetClause(data, 1);
    const user = await this.queryOne<User>(
      `UPDATE users SET ${clause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
      [...values, userId]
    );
    return user!;
  }
}
