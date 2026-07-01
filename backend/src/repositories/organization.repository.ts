import { BaseRepository } from './base.repository';
import { Organization, OrganizationMember } from '../entities/organization.entity';

export class OrganizationRepository extends BaseRepository {
  async findById(id: string): Promise<Organization | null> {
    return this.queryOne<Organization>(
      'SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.queryOne<Organization>(
      'SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
  }

  async create(data: { name: string; slug: string; owner_user_id: string }): Promise<Organization> {
    const org = await this.queryOne<Organization>(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *`,
      [data.name, data.slug]
    );
    // Add owner member
    await this.query(
      `INSERT INTO organization_members (organization_id, user_id, role, joined_at)
       VALUES ($1, $2, 'owner', NOW())`,
      [org!.id, data.owner_user_id]
    );
    return org!;
  }

  async getMember(orgId: string, userId: string): Promise<OrganizationMember | null> {
    return this.queryOne<OrganizationMember>(
      'SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, userId]
    );
  }

  async listMembers(orgId: string): Promise<(OrganizationMember & { email: string; full_name: string; avatar_url: string | null })[]> {
    return this.query(
      `SELECT om.*, u.email, u.full_name, u.avatar_url
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY om.invited_at ASC`,
      [orgId]
    );
  }

  async addMember(data: { org_id: string; user_id: string; role: string; invited_by: string }): Promise<OrganizationMember> {
    const member = await this.queryOne<OrganizationMember>(
      `INSERT INTO organization_members (organization_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, user_id) DO NOTHING
       RETURNING *`,
      [data.org_id, data.user_id, data.role, data.invited_by]
    );
    return member!;
  }

  async updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
    await this.query(
      'UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3',
      [role, orgId, userId]
    );
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await this.query(
      'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, userId]
    );
  }

  async softDelete(orgId: string, deleteAfterDays = 30): Promise<void> {
    await this.query(
      `UPDATE organizations
       SET deleted_at = NOW(),
           delete_after = NOW() + INTERVAL '${deleteAfterDays} days',
           updated_at = NOW()
       WHERE id = $1`,
      [orgId]
    );
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    return this.query<Organization>(
      `SELECT o.* FROM organizations o
       JOIN organization_members om ON om.organization_id = o.id
       WHERE om.user_id = $1 AND o.deleted_at IS NULL
       ORDER BY o.created_at ASC`,
      [userId]
    );
  }

  async generateUniqueSlug(base: string): Promise<string> {
    const normalized = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = normalized;
    let attempt = 0;
    while (true) {
      const existing = await this.findBySlug(slug);
      if (!existing) return slug;
      attempt++;
      slug = `${normalized}-${attempt}`;
    }
  }
}
