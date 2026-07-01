import { IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class QueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  query!: string;

  @IsOptional()
  @IsIn(['vector_only', 'graph_only', 'hybrid', 'auto'])
  strategy?: 'vector_only' | 'graph_only' | 'hybrid' | 'auto';

  @IsOptional()
  top_k?: number;
}
