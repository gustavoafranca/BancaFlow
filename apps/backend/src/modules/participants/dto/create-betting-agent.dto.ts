import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Telefone com rótulo opcional (D3: mesmo formato em criação e edição,
 * simétrico ao DTO de saída `PartyContactDTO`).
 */
export class PartyContactBodyDto {
  @IsString()
  @MinLength(1)
  phone!: string;

  @IsOptional()
  @IsString()
  label?: string;
}

const POLICY_TYPES = [
  'PERCENTAGE_ON_SALES',
  'FIXED_WEEKLY',
  'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
] as const;

/**
 * Payload da política (união discriminada por `type`). A validação fina (faixas,
 * combinação obrigatória por tipo, rejeição de `FIXED_PER_ENTRY`) é feita pelo
 * VO de domínio `CompensationPolicy`; aqui só garantimos a forma do corpo.
 */
export class CompensationPolicyBodyDto {
  @IsIn(POLICY_TYPES)
  type!: (typeof POLICY_TYPES)[number];

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyFixedAmountCents?: number;
}

export class BettingAgentAddressBodyDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsString()
  @MinLength(1)
  neighborhood!: string;

  @IsString()
  @MinLength(1)
  city!: string;
}

/**
 * Corpo de `POST /participants/betting-agents`. `bancaId` e o autor NÃO vêm do
 * corpo — são derivados do contexto autenticado no controller.
 */
export class CreateBettingAgentDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @ValidateNested()
  @Type(() => CompensationPolicyBodyDto)
  policy!: CompensationPolicyBodyDto;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyContactBodyDto)
  phones?: PartyContactBodyDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BettingAgentAddressBodyDto)
  address?: BettingAgentAddressBodyDto;

  @IsOptional()
  @IsBoolean()
  confirmPossibleDuplicate?: boolean;
}
