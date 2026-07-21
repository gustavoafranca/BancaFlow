import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ADMINISTRABLE_ROLES = ['ADMIN', 'USER'] as const;
const ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
// Teto HTTP de `pageSize` (decisão D8, `refine-tenant-user-administration-experience`):
// protege o endpoint contra páginas grandes o suficiente para virar um vetor
// de custo/negação de serviço. Default do Web continua 20; se métricas reais
// pedirem outro teto, uma change futura ajusta este contrato.
const MAX_PAGE_SIZE = 100;

export class ListUserAccountsDto {
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

  @IsOptional()
  @IsIn(ADMINISTRABLE_ROLES)
  role?: (typeof ADMINISTRABLE_ROLES)[number];

  @IsOptional()
  @IsIn(ACCOUNT_STATUSES)
  status?: (typeof ACCOUNT_STATUSES)[number];
}
