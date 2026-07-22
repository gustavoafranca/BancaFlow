import { AccountRoleType, Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { BettingAgent } from '../../betting-agent/betting-agent.entity';
import { BettingAgentRepository } from '../../betting-agent/betting-agent.repository';
import { CompensationPolicyInput } from '../../betting-agent/vo/compensation-policy.vo';
import { Party, PartyAddressInput, PartyContactInput } from '../../party/party.entity';
import { PartyRepository } from '../../party/party.repository';
import { PartyDuplicateQuery } from '../../party/query/party-duplicate.query';
import type { DuplicateCandidateDTO } from '../../shared/dto/betting-agent.dto';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';

export interface CreateBettingAgentInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  code: string;
  policy: CompensationPolicyInput;
  name?: string | null;
  nickname?: string | null;
  /** `{ phone, label? }[]` (D3) — mesmo formato da edição, com rótulo opcional. */
  phones?: PartyContactInput[];
  address?: PartyAddressInput | null;
  confirmPossibleDuplicate: boolean;
}

/**
 * Resultado discriminado. `POSSIBLE_DUPLICATE` é um caminho de negócio (não
 * persiste; carrega candidatos mínimos) — modelado como `outcome` no OUTPUT em
 * vez de `Result.fail`, porque o `Result` compartilhado não carrega payload em
 * falha. O controller mapeia `POSSIBLE_DUPLICATE` para HTTP 409 com os candidatos.
 */
export type CreateBettingAgentOutput =
  | { outcome: 'CREATED'; bettingAgentId: string; partyId: string; code: string }
  | { outcome: 'POSSIBLE_DUPLICATE'; candidates: DuplicateCandidateDTO[] };

/**
 * Cria atomicamente uma nova `Party` PERSON + `BettingAgent` + política inicial
 * na mesma transação (D24). Autoriza via `hasPermission` (porta injetada). O
 * alerta de possível duplicidade é confirmável e nunca bloqueia: sem confirmação
 * e havendo candidatos, retorna sem abrir transação (nada persiste); com
 * confirmação, prossegue. Conflito de código único vira `CODE_ALREADY_EXISTS`.
 */
export class CreateBettingAgentUseCase
  implements UseCase<CreateBettingAgentInput, CreateBettingAgentOutput>
{
  constructor(
    private readonly parties: PartyRepository,
    private readonly bettingAgents: BettingAgentRepository,
    private readonly duplicates: PartyDuplicateQuery,
    private readonly permissions: PermissionChecker,
    private readonly clock: Clock,
    private readonly tx: TransactionManager,
  ) {}

  async execute(data: CreateBettingAgentInput): Promise<Result<CreateBettingAgentOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'participants.betting-agents.create')) {
      return Result.fail(PARTICIPANTS_ERRORS.FORBIDDEN);
    }

    const now = this.clock.now();

    // Construção/validação de domínio fora da transação (falha retorna cedo).
    const partyResult = Party.tryCreate({
      id: this.parties.nextId(),
      bancaId: data.bancaId,
      name: data.name ?? null,
      nickname: data.nickname ?? null,
      contacts: data.phones ?? [],
      address: data.address ?? null,
      createdBy: data.actorUserId,
      now,
    });
    if (partyResult.isFailure) {
      return Result.fail(partyResult.errors!);
    }
    const party = partyResult.instance;

    const agentResult = BettingAgent.tryCreate({
      id: this.bettingAgents.nextId(),
      bancaId: data.bancaId,
      partyId: party.id,
      code: data.code,
      policy: data.policy,
      policyEffectiveFrom: now,
      policyEffectiveTo: null,
      createdBy: data.actorUserId,
    });
    if (agentResult.isFailure) {
      return Result.fail(agentResult.errors!);
    }
    const agent = agentResult.instance;

    // Alerta confirmável de possível duplicidade — só quando não confirmado.
    if (!data.confirmPossibleDuplicate) {
      const candidatesResult = await this.duplicates.findCandidates({
        bancaId: data.bancaId,
        phones: party.contacts.map((contact) => contact.phoneValue),
        name: party.name,
        nickname: party.nickname,
      });
      if (candidatesResult.isFailure) {
        return Result.fail(candidatesResult.errors!);
      }
      if (candidatesResult.instance.length > 0) {
        // Nada é persistido; nenhuma transação é aberta.
        return Result.ok({ outcome: 'POSSIBLE_DUPLICATE', candidates: candidatesResult.instance });
      }
    }

    return this.tx.runInTransactionResult<CreateBettingAgentOutput>(async () => {
      const savedParty = await this.parties.save(party);
      if (savedParty.isFailure) {
        return Result.fail(savedParty.errors!);
      }

      const savedAgent = await this.bettingAgents.save(agent);
      if (savedAgent.isFailure) {
        return Result.fail(savedAgent.errors!);
      }

      return Result.ok({
        outcome: 'CREATED',
        bettingAgentId: agent.id,
        partyId: party.id,
        code: agent.code.value,
      });
    });
  }
}
