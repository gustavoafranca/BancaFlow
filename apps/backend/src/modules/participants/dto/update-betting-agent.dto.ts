import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BettingAgentAddressBodyDto, PartyContactBodyDto } from './create-betting-agent.dto';

const STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;

/**
 * Corpo de `PATCH /participants/betting-agents/:id`. Política NUNCA é aceita
 * aqui (imutável por este endpoint) — nem sequer tem campo no DTO, então
 * `whitelist: true` a rejeitaria se enviada. `code`, ao contrário, TEM campo
 * aqui só para ser aceito e descartado: o requisito de domínio exige que
 * reenviar o `code` atual (ex.: formulário que sempre manda o objeto inteiro)
 * NÃO bloqueie a edição dos demais campos — o controller nunca repassa este
 * valor ao caso de uso, então o código nunca muda por aqui. `address: null`
 * explícito e ausência da chave têm o mesmo efeito (remove o endereço ativo,
 * D5) — só a presença de um objeto válido substitui.
 */
export class UpdateBettingAgentDto {
  @IsOptional()
  @IsString()
  code?: string;

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
  address?: BettingAgentAddressBodyDto | null;
}

/** Corpo de `PATCH /participants/betting-agents/:id/status`. */
export class SetBettingAgentStatusDto {
  @IsIn(STATUS_VALUES)
  status!: (typeof STATUS_VALUES)[number];
}
