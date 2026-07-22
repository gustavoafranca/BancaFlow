import {
  hasPermission as accessControlHasPermission,
  type PermissionKey,
} from '@bancaflow/access-control';
import { AccountRoleType, Id, Result, TransactionManager } from '@bancaflow/shared';
import { BettingAgent } from '../../src/betting-agent/betting-agent.entity';
import { BettingAgentRepository } from '../../src/betting-agent/betting-agent.repository';
import { Party } from '../../src/party/party.entity';
import { PartyRepository } from '../../src/party/party.repository';
import {
  DuplicateProbe,
  PartyDuplicateQuery,
} from '../../src/party/query/party-duplicate.query';
import { DuplicateCandidateDTO } from '../../src/shared/dto/betting-agent.dto';
import { PARTICIPANTS_ERRORS } from '../../src/shared/errors/participants.errors';
import { Clock } from '../../src/shared/ports/clock.port';
import { PermissionChecker } from '../../src/shared/ports/permission-checker.port';

/** Delega para o catálogo real de `@bancaflow/access-control` (já testado ali). */
export class RealPermissionChecker implements PermissionChecker {
  hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean {
    return accessControlHasPermission(actorRole, permissionKey);
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current.getTime());
  }
}

export class PassthroughTransactionManager implements TransactionManager {
  async runInTransaction<T>(operation: (ctx: unknown) => Promise<T>): Promise<T> {
    return operation({});
  }
  async runInTransactionResult<T>(
    operation: (ctx: unknown) => Promise<Result<T>>,
  ): Promise<Result<T>> {
    return operation({});
  }
}

/**
 * Simula o rollback real do Prisma: se o callback retornar `Result.fail`, o
 * estado dos repositórios fake é restaurado a partir de um snapshot anterior.
 */
export class RollbackOnFailureTransactionManager implements TransactionManager {
  constructor(private readonly repos: { snapshot(): unknown; restore(snap: unknown): void }[]) {}

  async runInTransaction<T>(operation: (ctx: unknown) => Promise<T>): Promise<T> {
    return operation({});
  }

  async runInTransactionResult<T>(
    operation: (ctx: unknown) => Promise<Result<T>>,
  ): Promise<Result<T>> {
    const snapshots = this.repos.map((repo) => repo.snapshot());
    const result = await operation({});
    if (result.isFailure) {
      this.repos.forEach((repo, index) => repo.restore(snapshots[index]));
    }
    return result;
  }
}

export class InMemoryPartyRepository implements PartyRepository {
  readonly store = new Map<string, Party>();

  nextId(): string {
    return Id.createUUID();
  }

  async save(party: Party): Promise<Result<void>> {
    this.store.set(party.id, party);
    return Result.ok();
  }

  async findById(id: string, bancaId: string): Promise<Result<Party | null>> {
    const found = this.store.get(id);
    if (!found || found.bancaId !== bancaId) {
      return Result.ok(null);
    }
    return Result.ok(found);
  }

  failUpdate = false;

  async update(party: Party): Promise<Result<void>> {
    if (this.failUpdate) {
      return Result.fail('PARTICIPANTS.TECHNICAL_FAILURE');
    }
    this.store.set(party.id, party);
    return Result.ok();
  }

  snapshot(): Map<string, Party> {
    return new Map(this.store);
  }

  restore(snap: unknown): void {
    this.store.clear();
    for (const [key, value] of snap as Map<string, Party>) {
      this.store.set(key, value);
    }
  }
}

export class InMemoryBettingAgentRepository implements BettingAgentRepository {
  readonly store = new Map<string, BettingAgent>();
  failSave = false;

  nextId(): string {
    return Id.createUUID();
  }

  async save(agent: BettingAgent): Promise<Result<void>> {
    if (this.failSave) {
      return Result.fail('PARTICIPANTS.TECHNICAL_FAILURE');
    }

    const conflict = [...this.store.values()].some(
      (existing) =>
        existing.bancaId === agent.bancaId &&
        existing.code.value === agent.code.value &&
        existing.id !== agent.id,
    );
    if (conflict) {
      return Result.fail(PARTICIPANTS_ERRORS.CODE_ALREADY_EXISTS);
    }

    this.store.set(agent.id, agent);
    return Result.ok();
  }

  async findById(id: string, bancaId: string): Promise<Result<BettingAgent | null>> {
    const found = this.store.get(id);
    if (!found || found.bancaId !== bancaId) {
      return Result.ok(null);
    }
    return Result.ok(found);
  }

  failUpdateStatus = false;

  async updateStatus(agent: BettingAgent): Promise<Result<void>> {
    if (this.failUpdateStatus) {
      return Result.fail('PARTICIPANTS.TECHNICAL_FAILURE');
    }
    this.store.set(agent.id, agent);
    return Result.ok();
  }

  snapshot(): Map<string, BettingAgent> {
    return new Map(this.store);
  }

  restore(snap: unknown): void {
    this.store.clear();
    for (const [key, value] of snap as Map<string, BettingAgent>) {
      this.store.set(key, value);
    }
  }
}

export class StubPartyDuplicateQuery implements PartyDuplicateQuery {
  candidates: DuplicateCandidateDTO[] = [];
  lastProbe?: DuplicateProbe;

  async findCandidates(probe: DuplicateProbe): Promise<Result<DuplicateCandidateDTO[]>> {
    this.lastProbe = probe;
    return Result.ok(this.candidates);
  }
}
