import {
  CreateBettingAgentUseCase,
  GetBettingAgentUseCase,
  ListBettingAgentsUseCase,
  SetBettingAgentStatusUseCase,
  UpdateBettingAgentProfileUseCase,
} from '@bancaflow/participants';
import type {
  BettingAgentQuery,
  BettingAgentRepository,
  Clock,
  PartyDuplicateQuery,
  PartyRepository,
  PermissionChecker,
} from '@bancaflow/participants';
import type { TransactionManager } from '@bancaflow/shared';
import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { PrismaService } from '../../db/prisma.service';
import { AccessControlPermissionChecker } from '../../shared/adapters/access-control-permission-checker.adapter';
import { SystemClockProvider } from '../../shared/adapters/system-clock.provider';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { BettingAgentQueryPrisma } from './adapters/betting-agent.query.prisma';
import { BettingAgentRepositoryPrisma } from './adapters/betting-agent.repository.prisma';
import { PartyDuplicateQueryPrisma } from './adapters/party-duplicate.query.prisma';
import { PartyRepositoryPrisma } from './adapters/party.repository.prisma';
import { BettingAgentController } from './betting-agent.controller';
import {
  BETTING_AGENT_QUERY,
  BETTING_AGENT_REPOSITORY,
  CLOCK,
  CREATE_BETTING_AGENT_USE_CASE,
  GET_BETTING_AGENT_USE_CASE,
  LIST_BETTING_AGENTS_USE_CASE,
  PARTY_DUPLICATE_QUERY,
  PARTY_REPOSITORY,
  PERMISSION_CHECKER,
  SET_BETTING_AGENT_STATUS_USE_CASE,
  TRANSACTION_MANAGER,
  UPDATE_BETTING_AGENT_PROFILE_USE_CASE,
} from './participants.tokens';

/**
 * Composition root do Participants. Portas → adapters Prisma; `TRANSACTION_MANAGER`
 * reusa o `PrismaService` (`useExisting`); os casos de uso são montados por
 * `useFactory`/`inject`. Importa `IdentityModule` apenas para reaproveitar o
 * guard de autenticação exportado (`JwtCookieAuthGuard`) e `DbModule` para o
 * `PrismaService`.
 */
@Module({
  // `IdentityModule` fornece o guard `JwtCookieAuthGuard` (e suas deps de
  // Identity, exportadas); `TenancyModule` fornece `BANCA_REPOSITORY`, exigido
  // pelo guard ao ser reconstruído no injetor deste módulo.
  imports: [DbModule, IdentityModule, TenancyModule],
  controllers: [BettingAgentController],
  providers: [
    { provide: PARTY_REPOSITORY, useClass: PartyRepositoryPrisma },
    {
      provide: BETTING_AGENT_REPOSITORY,
      useClass: BettingAgentRepositoryPrisma,
    },
    { provide: PARTY_DUPLICATE_QUERY, useClass: PartyDuplicateQueryPrisma },
    { provide: BETTING_AGENT_QUERY, useClass: BettingAgentQueryPrisma },
    { provide: PERMISSION_CHECKER, useClass: AccessControlPermissionChecker },
    { provide: CLOCK, useClass: SystemClockProvider },
    { provide: TRANSACTION_MANAGER, useExisting: PrismaService },
    {
      provide: CREATE_BETTING_AGENT_USE_CASE,
      useFactory: (
        parties: PartyRepository,
        agents: BettingAgentRepository,
        duplicates: PartyDuplicateQuery,
        permissions: PermissionChecker,
        clock: Clock,
        tx: TransactionManager,
      ) =>
        new CreateBettingAgentUseCase(
          parties,
          agents,
          duplicates,
          permissions,
          clock,
          tx,
        ),
      inject: [
        PARTY_REPOSITORY,
        BETTING_AGENT_REPOSITORY,
        PARTY_DUPLICATE_QUERY,
        PERMISSION_CHECKER,
        CLOCK,
        TRANSACTION_MANAGER,
      ],
    },
    {
      provide: LIST_BETTING_AGENTS_USE_CASE,
      useFactory: (query: BettingAgentQuery, permissions: PermissionChecker) =>
        new ListBettingAgentsUseCase(query, permissions),
      inject: [BETTING_AGENT_QUERY, PERMISSION_CHECKER],
    },
    {
      provide: GET_BETTING_AGENT_USE_CASE,
      useFactory: (query: BettingAgentQuery, permissions: PermissionChecker) =>
        new GetBettingAgentUseCase(query, permissions),
      inject: [BETTING_AGENT_QUERY, PERMISSION_CHECKER],
    },
    {
      provide: UPDATE_BETTING_AGENT_PROFILE_USE_CASE,
      useFactory: (
        agents: BettingAgentRepository,
        parties: PartyRepository,
        permissions: PermissionChecker,
        clock: Clock,
        tx: TransactionManager,
      ) => new UpdateBettingAgentProfileUseCase(agents, parties, permissions, clock, tx),
      inject: [
        BETTING_AGENT_REPOSITORY,
        PARTY_REPOSITORY,
        PERMISSION_CHECKER,
        CLOCK,
        TRANSACTION_MANAGER,
      ],
    },
    {
      provide: SET_BETTING_AGENT_STATUS_USE_CASE,
      useFactory: (
        agents: BettingAgentRepository,
        permissions: PermissionChecker,
        clock: Clock,
        tx: TransactionManager,
      ) => new SetBettingAgentStatusUseCase(agents, permissions, clock, tx),
      inject: [BETTING_AGENT_REPOSITORY, PERMISSION_CHECKER, CLOCK, TRANSACTION_MANAGER],
    },
  ],
})
export class ParticipantsModule {}
