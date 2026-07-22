import { AccountRoleType } from './account-role.type';

/**
 * Porta de checagem de permissão consumida por casos de uso de qualquer
 * módulo, em vez de importar `hasPermission` diretamente em cada um — permite
 * substituição em teste e evolução do adapter sem alterar os casos de uso.
 * Implementada no composition root (`apps/backend`) por um adapter que delega
 * para `hasPermission` de `@bancaflow/access-control`.
 *
 * Genérica sobre `TPermissionKey` porque `packages/shared` não pode depender
 * de `@bancaflow/access-control` (que já depende de `shared`); cada módulo de
 * domínio especializa o tipo localmente, ex.:
 * `type PermissionChecker = SharedPermissionChecker<PermissionKey>`.
 */
export interface PermissionChecker<TPermissionKey = string> {
  hasPermission(actorRole: AccountRoleType, permissionKey: TPermissionKey): boolean;
}
