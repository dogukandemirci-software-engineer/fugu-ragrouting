import { IsString, IsUrl, IsArray, MinLength, MaxLength } from 'class-validator';

const WEBHOOK_EVENTS = [
  'query.completed',
  'document.ingested',
  'document.failed',
  'api_key.created',
  'api_key.revoked',
  'subscription.changed',
  'team.member_added',
  'team.member_removed',
] as const;

export class CreateWebhookDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsUrl()
  url!: string;

  @IsArray()
  @IsString({ each: true })
  events!: string[];
}
