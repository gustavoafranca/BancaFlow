import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Teto HTTP de `pageSize` (mesma proteção contra páginas grandes usada em
// Identity); default do Web é 20.
const MAX_PAGE_SIZE = 100;

export class ListBettingAgentsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}
