import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'

// Cliente HTTP das permissões efetivas do próprio ator autenticado. Espelha
// `OwnEffectivePermissionsDto` de `@bancaflow/access-control`
// (`GET /api/access-control/me/permissions`) — disponível a qualquer papel.
// Usado pelo shell privado para gatear itens de menu por `PermissionKey`,
// nunca por papel bruto (ver openspec/changes/enable-tenant-user-administration).

const BASE = '/api/access-control'

export type AccountRoleName = 'OWNER' | 'ADMIN' | 'USER'

export interface EffectivePermission {
  key: string
  label: string
}

export interface OwnEffectivePermissions {
  role: AccountRoleName
  permissions: EffectivePermission[]
}

export type MyPermissionsResult = { status: 'success'; data: OwnEffectivePermissions } | { status: 'error' }

/**
 * GET /api/access-control/me/permissions — disponível a qualquer papel
 * autenticado, sem exigir uma `PermissionKey` própria para o acesso.
 */
export async function getMyPermissions(): Promise<MyPermissionsResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/me/permissions`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<unknown>(res)
  if (!isOwnEffectivePermissions(body)) return { status: 'error' }
  return { status: 'success', data: body }
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

const VALID_ROLES = new Set<string>(['OWNER', 'ADMIN', 'USER'])

function isEffectivePermission(value: unknown): value is EffectivePermission {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry.key === 'string' && typeof entry.label === 'string'
}

/**
 * Validação mínima e estrutural: um payload `200` malformado vira `error`,
 * nunca `success` com um `permissions` que quebraria o consumidor ao acessar
 * `.some`/`.map`.
 */
function isOwnEffectivePermissions(value: unknown): value is OwnEffectivePermissions {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.role === 'string' &&
    VALID_ROLES.has(body.role) &&
    Array.isArray(body.permissions) &&
    body.permissions.every(isEffectivePermission)
  )
}
