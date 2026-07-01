import { IsString, MinLength, MaxLength, IsArray, IsIn, IsOptional, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsArray()
  @IsIn(['read', 'write'], { each: true })
  permissions!: string[];

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
