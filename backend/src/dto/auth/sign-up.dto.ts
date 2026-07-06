import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  full_name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  organization_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  referral_code?: string;
}
