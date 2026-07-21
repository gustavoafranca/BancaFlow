import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  BancaDisplayContextQuery,
  BancaRepository,
  GetBancaContextUseCase,
  GetBancaDisplayContextUseCase,
} from '@bancaflow/tenancy';
import { DbModule } from '../../db/db.module';
import { PrismaService } from '../../db/prisma.service';
import { TenantResolverMiddleware } from '../../shared/middleware/tenant-resolver.middleware';
import { BancaRepositoryPrisma } from './adapters/banca.repository.prisma';
import { BancaContextResolver } from './adapters/banca-context.resolver';
import { BancaDisplayContextQueryPrisma } from './adapters/banca-display-context.query.prisma';
import { BancaDisplayContextResolver } from './adapters/banca-display-context.resolver';
import { TenancyController } from './tenancy.controller';

/** Token de injeção para o contrato de domínio `BancaRepository`. */
export const BANCA_REPOSITORY = 'BANCA_REPOSITORY';
/** Token para o `TransactionManager` compartilhado (implementado pelo `PrismaService`). */
export const TENANCY_TRANSACTION_MANAGER = 'TENANCY_TRANSACTION_MANAGER';
/** Token da leitura (CQRS) de contexto de exibição da banca por `bancaId`. */
export const BANCA_DISPLAY_CONTEXT_QUERY = 'BANCA_DISPLAY_CONTEXT_QUERY';

/**
 * `TenancyModule` NÃO depende de `IdentityModule` (D10): a composição de
 * `ProvisionBancaUseCase` — que precisa de ambos os módulos — vive em
 * `PlatformProvisioningModule` (composition root externo), eliminando o ciclo
 * real que existia antes entre Identity e Tenancy via `forwardRef`.
 * `BANCA_REPOSITORY` é exportado para que a composition root monte o
 * `ProvisionBancaUseCase` sem reabrir este módulo.
 */
@Module({
  imports: [
    DbModule,
    // Limite do endpoint público `GET /api/tenant-context` (D6/risco do
    // design.md: "endpoint público de contexto por host pode permitir
    // enumeração de tenants" — mitigação de rate limiting explicitamente
    // aprovada). Por IP, generoso o bastante para o `proxy.ts` consultar a
    // cada navegação de página, mas limita varredura de subdomínios.
    ThrottlerModule.forRoot([
      { name: 'tenant-context', ttl: 10_000, limit: 30 },
    ]),
  ],
  controllers: [TenancyController],
  providers: [
    {
      provide: BANCA_REPOSITORY,
      useClass: BancaRepositoryPrisma,
    },
    {
      provide: TENANCY_TRANSACTION_MANAGER,
      useExisting: PrismaService,
    },
    {
      provide: GetBancaContextUseCase,
      useFactory: (bancas: BancaRepository) =>
        new GetBancaContextUseCase(bancas),
      inject: [BANCA_REPOSITORY],
    },
    {
      provide: BANCA_DISPLAY_CONTEXT_QUERY,
      useClass: BancaDisplayContextQueryPrisma,
    },
    {
      provide: GetBancaDisplayContextUseCase,
      useFactory: (query: BancaDisplayContextQuery) =>
        new GetBancaDisplayContextUseCase(query),
      inject: [BANCA_DISPLAY_CONTEXT_QUERY],
    },
    BancaContextResolver,
    BancaDisplayContextResolver,
  ],
  exports: [
    BancaContextResolver,
    BancaDisplayContextResolver,
    GetBancaContextUseCase,
    GetBancaDisplayContextUseCase,
    BANCA_REPOSITORY,
    TENANCY_TRANSACTION_MANAGER,
  ],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Mesma resolução de `codigoBanca` por host do login, agora reaproveitada
    // pelo endpoint público de contexto (`GET /api/tenant-context`).
    consumer
      .apply(TenantResolverMiddleware)
      .forRoutes({ path: 'tenant-context', method: RequestMethod.GET });
  }
}
