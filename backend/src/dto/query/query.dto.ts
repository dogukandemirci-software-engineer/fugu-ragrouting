import { IsString, MinLength, MaxLength, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  query!: string;

  @IsOptional()
  @IsIn(['vector_only', 'graph_only', 'hybrid', 'auto'])
  strategy?: 'vector_only' | 'graph_only' | 'hybrid' | 'auto';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  top_k?: number;
}
