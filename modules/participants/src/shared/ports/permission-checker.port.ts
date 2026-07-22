import type { PermissionChecker as GenericPermissionChecker } from '@bancaflow/shared';
import type { PermissionKey } from '@bancaflow/access-control';

/**
 * Especialização, para Participants, da porta genérica `PermissionChecker` de
 * `@bancaflow/shared` (mesmo padrão de dependência injetada de Identity, em
 * vez de importar `hasPermission` diretamente em cada caso de uso) — permite
 * substituição em teste e evolução do adapter sem alterar os casos de uso.
 * Implementada no composition root (`apps/backend`) por um adapter que
 * delega para `hasPermission` de `@bancaflow/access-control`.
 */
export type PermissionChecker = GenericPermissionChecker<PermissionKey>;
