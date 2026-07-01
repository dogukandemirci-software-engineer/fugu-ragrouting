import { IsEmail, IsIn, IsUUID } from 'class-validator';

export class InviteTeamMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['admin', 'member', 'viewer'])
  role!: 'admin' | 'member' | 'viewer';
}

export class UpdateTeamMemberRoleDto {
  @IsUUID()
  member_id!: string;

  @IsIn(['admin', 'member', 'viewer'])
  role!: 'admin' | 'member' | 'viewer';
}
