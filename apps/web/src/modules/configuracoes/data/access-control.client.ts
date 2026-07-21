import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'

// Cliente HTTP do catálogo autoritativo de permissões. Espelha
// `RolePermissionMatrixDto` de `@bancaflow/access-control`
// (`GET /api/access-control/role-permissions`) — restrito a OWNER/ADMIN no
// Backend. O Web nunca decide autorização, apenas exibe o que o Backend
// autorizou (ver openspec/changes/establish-authoritative-role-permissions).

const BASE = '/api/access-control'

export interface RolePermissionEntry {
  key: string
  label: string
  description: string
  order: number
  roles: ('OWNER' | 'ADMIN' | 'USER')[]
}

export interface RolePermissionCapability {
  capability: string
  label: string
  order: number
  permissions: RolePermissionEntry[]
}

export interface RolePermissionMatrix {
  capabilities: RolePermissionCapability[]
}

export type RolePermissionsResult =
  | { status: 'success'; data: RolePermissionMatrix }
  | { status: 'forbidden' }
  | { status: 'error' }

/**
 * GET /api/access-control/role-permissions — matriz completa papel × permissão,
 * somente leitura. O Backend nega (403) para `USER`; o Web trata isso como um
 * estado de acesso negado, não como erro técnico.
 */
export async function getRolePermissions(): Promise<RolePermissionsResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/role-permissions`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<unknown>(res)
  if (!isRolePermissionMatrix(body)) return { status: 'error' }
  return { status: 'success', data: body }
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

const VALID_ROLES = new Set(['OWNER', 'ADMIN', 'USER'])

function isRolePermissionEntry(value: unknown): value is RolePermissionEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.key === 'string' &&
    typeof entry.label === 'string' &&
    typeof entry.description === 'string' &&
    typeof entry.order === 'number' &&
    Array.isArray(entry.roles) &&
    entry.roles.every((role) => typeof role === 'string' && VALID_ROLES.has(role))
  )
}

function isRolePermissionCapability(value: unknown): value is RolePermissionCapability {
  if (typeof value !== 'object' || value === null) return false
  const capability = value as Record<string, unknown>
  return (
    typeof capability.capability === 'string' &&
    typeof capability.label === 'string' &&
    typeof capability.order === 'number' &&
    Array.isArray(capability.permissions) &&
    capability.permissions.every(isRolePermissionEntry)
  )
}

/**
 * Validação mínima e estrutural (não um schema completo): um payload `200`
 * malformado vira `error`, nunca `success` com um `capabilities` que quebraria
 * o componente ao acessar `.map`/`.flatMap`.
 */
function isRolePermissionMatrix(value: unknown): value is RolePermissionMatrix {
  if (typeof value !== 'object' || value === null) return false
  const matrix = value as Record<string, unknown>
  return Array.isArray(matrix.capabilities) && matrix.capabilities.every(isRolePermissionCapability)
}
