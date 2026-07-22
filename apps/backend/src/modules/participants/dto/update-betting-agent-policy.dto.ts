import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CompensationPolicyBodyDto } from './create-betting-agent.dto';

/**
 * Corpo de `PATCH /participants/betting-agents/:id/policy`. Endpoint
 * dedicado (D2, `enable-betting-agent-policy-update`) — reaproveita
 * `CompensationPolicyBodyDto` já usado na criação, sem duplicar a forma do
 * payload. `bancaId` e o ator vêm do contexto autenticado no controller.
 */
export class UpdateBettingAgentPolicyDto {
  @ValidateNested()
  @Type(() => CompensationPolicyBodyDto)
  policy!: CompensationPolicyBodyDto;
}
