import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateOrgSettingsDto {
  // Appended after the base synthesis system prompt, never replacing it —
  // see answer-synthesis.service.ts. Capped well under typical context
  // limits since it's added to every single query.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  custom_instructions?: string;
}
