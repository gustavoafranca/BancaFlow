import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import type { AuthenticatedUserContextDto } from '../../shared/dto/authenticated-user-context.dto';
import type { AuthenticatedUserAccountQuery } from '../../shared/ports/authenticated-user-account.query';
import type { BancaDisplayContextResolver } from '../../shared/ports/banca-display-context-resolver.port';
import type { PermissionChecker } from '../../shared/ports/permission-checker.port';

export interface GetAuthenticatedUserContextInput {
  userId: string;
  bancaId: string;
  actorRole: AccountRoleType;
}

/**
 * Compõe o contexto de exibição do próprio usuário autenticado: a projeção da
 * conta (por `userId + bancaId`) + o contexto de exibição da banca (por
 * `bancaId`). `userId`/`bancaId` vêm exclusivamente do contexto autenticado —
 * nunca do cliente.
 *
 * Taxonomia de falhas (desenho D7):
 *  - Categoria B (inconsistência esperada pós-guard) → `INVALID_CREDENTIALS`
 *    (401), sem enumeração, contexto parcial ou vazamento cross-tenant: conta
 *    ausente (`null`) ou de outra banca; banca ausente/inativa (`null`) ou que
 *    resolve outro `bancaId`.
 *  - Categoria C (falha técnica) → PROPAGADA distintamente até a borda HTTP
 *    (que traduz para `500` genérico). Vale para as DUAS dependências: a query
 *    de conta e o resolver de banca. Nunca é colapsada em `INVALID_CREDENTIALS`.
 *
 * O Identity NÃO interpreta o código de Tenancy: distingue apenas `null`
 * (ausência esperada) de `isFailure` (falha técnica) no `Result` do resolver.
 */
export class GetAuthenticatedUserContextUseCase
  implements UseCase<GetAuthenticatedUserContextInput, AuthenticatedUserContextDto>
{
  constructor(
    private readonly accounts: AuthenticatedUserAccountQuery,
    private readonly bancaDisplay: BancaDisplayContextResolver,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(
    data: GetAuthenticatedUserContextInput,
  ): Promise<Result<AuthenticatedUserContextDto>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.profile.read-own')) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    const account = await this.accounts.findByUserAndBanca(
      data.userId,
      data.bancaId,
    );
    if (account.isFailure) {
      return Result.fail(account.errors!);
    }
    const acc = account.instance;
    if (!acc || acc.bancaId !== data.bancaId) {
      return Result.fail(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const banca = await this.bancaDisplay.resolve(data.bancaId);
    if (banca.isFailure) {
      // Categoria C: falha técnica de Tenancy preservada até a borda HTTP.
      return Result.fail(banca.errors!);
    }
    const b = banca.instance;
    if (!b || b.bancaId !== data.bancaId) {
      // Categoria B: banca ausente/inativa ou corrida pós-guard.
      return Result.fail(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    return Result.ok({
      userId: acc.userId,
      username: acc.username,
      name: acc.name,
      email: acc.email,
      role: acc.role,
      version: acc.version,
      banca: {
        bancaId: b.bancaId,
        codigoBanca: b.codigoBanca,
        name: b.name,
      },
    });
  }
}
