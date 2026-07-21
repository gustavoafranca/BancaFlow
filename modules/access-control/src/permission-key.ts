import { Result } from '@bancaflow/shared';
import { ACCESS_CONTROL_ERRORS } from './errors/access-control.errors';
import { PERMISSION_CATALOG } from './permission-catalog';

/**
 * `PermissionKey` é derivada do literal `as const` de `PERMISSION_CATALOG`,
 * não mantida como uma união separada: uma chave só pode existir aqui se
 * estiver cadastrada no catálogo, eliminando divergência entre tipo e dado.
 */
export type PermissionKey = (typeof PERMISSION_CATALOG)[number]['permissions'][number]['key'];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSION_CATALOG.flatMap((capability) =>
  capability.permissions.map((permission) => permission.key),
);

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(PERMISSION_KEYS);

/**
 * Valida um valor não tipado de fronteira (log, teste, futura extensão dinâmica)
 * contra o catálogo fechado. Nenhum caso de uso interno tipado precisa chamar isto —
 * a checagem de autorização (`hasPermission`) é uma função total sobre `PermissionKey`.
 */
export function parsePermissionKey(value: unknown): Result<PermissionKey> {
  if (typeof value === 'string' && PERMISSION_KEY_SET.has(value)) {
    return Result.ok(value as PermissionKey);
  }
  return Result.fail(ACCESS_CONTROL_ERRORS.UNKNOWN_PERMISSION_KEY);
}
