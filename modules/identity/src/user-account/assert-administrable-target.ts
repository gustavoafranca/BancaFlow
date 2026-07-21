import { Result } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../shared/errors/identity.errors';
import { UserAccount } from './user-account.entity';

/**
 * Política de alvo para operações administrativas de conta. Chamada
 * **depois** que o alvo já foi resolvido via `UserAccountRepository.findById`
 * escopado pelo `bancaId` do ator — o isolamento de tenant e a checagem de
 * papel do ator (`PermissionChecker.hasPermission`) NÃO são responsabilidade
 * deste helper; ele valida apenas a relação ator↔alvo que não é
 * representável como `PermissionKey`:
 * - o ator não administra a própria conta por este painel (autosserviço
 *   continua exclusivo de `/auth/me`, `/auth/password`, `/auth/sessions`);
 * - ninguém administra `OWNER` por este painel.
 */
export function assertAdministrableTarget(actorUserId: string, target: UserAccount): Result<void> {
  if (target.id === actorUserId) {
    return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
  }
  if (target.role.isOwner) {
    return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
  }
  return Result.ok();
}
