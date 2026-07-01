import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  updatePasswordHash(userId: string, hash: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  updateProfile(userId: string, data: Partial<Pick<User, 'full_name' | 'avatar_url'>>): Promise<User>;
}
