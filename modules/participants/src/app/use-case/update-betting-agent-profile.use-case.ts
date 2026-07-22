import { AccountRoleType, Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { BettingAgentRepository } from '../../betting-agent/betting-agent.repository';
import { PartyAddressInput, PartyContactInput } from '../../party/party.entity';
import { PartyRepository } from '../../party/party.repository';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';

export interface UpdateBettingAgentProfileInput {
  id: string;
  bancaId: string;
  actorRole: AccountRoleType;
  name?: string | null;
  nickname?: string | null;
  phones?: PartyContactInput[];
  address?: PartyAddressInput | null;
}

export interface UpdateBettingAgentProfileOutput {
  bettingAgentId: string;
  partyId: string;
}

/**
 * Edita nome/apelido/contatos/endereço da `Party` vinculada a um
 * `BettingAgent` existente (D4: nunca cria uma nova Party/BettingAgent).
 * `code` e política nunca são tocados aqui — nem sequer aparecem no input.
 * Recurso de outra Banca (ou inexistente) responde como não encontrado.
 */
export class UpdateBettingAgentProfileUseCase
  implements UseCase<UpdateBettingAgentProfileInput, UpdateBettingAgentProfileOutput>
{
  constructor(
    private readonly bettingAgents: BettingAgentRepository,
    private readonly parties: PartyRepository,
    private readonly permissions: PermissionChecker,
    private readonly clock: Clock,
    private readonly tx: TransactionManager,
  ) {}

  async execute(
    data: UpdateBettingAgentProfileInput,
  ): Promise<Result<UpdateBettingAgentProfileOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'participants.betting-agents.update')) {
      return Result.fail(PARTICIPANTS_ERRORS.FORBIDDEN);
    }

    const agentResult = await this.bettingAgents.findById(data.id, data.bancaId);
    if (agentResult.isFailure) {
      return Result.fail(agentResult.errors!);
    }
    const agent = agentResult.instance;
    if (!agent) {
      return Result.fail(PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND);
    }

    const partyResult = await this.parties.findById(agent.partyId, data.bancaId);
    if (partyResult.isFailure) {
      return Result.fail(partyResult.errors!);
    }
    const party = partyResult.instance;
    if (!party) {
      return Result.fail(PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND);
    }

    const updatedResult = party.updateProfile({
      name: data.name,
      nickname: data.nickname,
      contacts: data.phones,
      address: data.address,
      now: this.clock.now(),
    });
    if (updatedResult.isFailure) {
      return Result.fail(updatedResult.errors!);
    }
    const updatedParty = updatedResult.instance;

    return this.tx.runInTransactionResult<UpdateBettingAgentProfileOutput>(async () => {
      const saved = await this.parties.update(updatedParty);
      if (saved.isFailure) {
        return Result.fail(saved.errors!);
      }
      return Result.ok({ bettingAgentId: agent.id, partyId: updatedParty.id });
    });
  }
}
