import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'

// Cliente HTTP da administração de contas da própria banca
// (`enable-tenant-user-administration`), exclusiva de OWNER no Backend. O
// Web nunca decide autorização — apenas trata `403` como "sem permissão" e
// `404` como "conta não encontrada" (nunca o contrário, ver design.md D11).

const ACCOUNTS_BASE = '/api/accounts'
const AUTH_BASE = '/api/auth'

export type AdministrableRole = 'ADMIN' | 'USER'
export type AccountStatusName = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export interface UserAccountListItem {
  userId: string
  username: string
  name: string
  email: string | null
  role: AdministrableRole
  status: AccountStatusName
  createdAt: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface UserAccountsPage {
  data: UserAccountListItem[]
  meta: PaginationMeta
}

export interface ListUserAccountsParams {
  page?: number
  pageSize?: number
  search?: string
  role?: AdministrableRole
  status?: AccountStatusName
}

export type ListUserAccountsResult =
  | { status: 'success'; data: UserAccountsPage }
  | { status: 'forbidden' }
  | { status: 'error' }

export async function listUserAccounts(params: ListUserAccountsParams = {}): Promise<ListUserAccountsResult> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.role) query.set('role', params.role)
  if (params.status) query.set('status', params.status)
  const qs = query.toString()

  let res: Response
  try {
    res = await fetchWithRefresh(`${ACCOUNTS_BASE}${qs ? `?${qs}` : ''}`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<unknown>(res)
  if (!isUserAccountsPage(body)) return { status: 'error' }
  return { status: 'success', data: body }
}

export interface UserAccountDetail {
  userId: string
  username: string
  name: string
  email: string | null
  role: AdministrableRole
  status: AccountStatusName
  mustChangePassword: boolean
  version: number
}

export type GetUserAccountResult =
  | { status: 'success'; data: UserAccountDetail }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error' }

export async function getUserAccount(accountId: string): Promise<GetUserAccountResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${ACCOUNTS_BASE}/${encodeURIComponent(accountId)}`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<UserAccountDetail>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export interface CreateUserAccountInput {
  username: string
  name: string
  email?: string
  role: AdministrableRole
}

export interface CreateUserAccountData {
  userId: string
  username: string
  role: AdministrableRole
  temporaryPassword: string
}

export type CreateUserAccountResult =
  | { status: 'success'; data: CreateUserAccountData }
  | { status: 'forbidden' }
  | { status: 'username_taken' }
  | { status: 'weak_password' }
  | { status: 'error' }

export async function createUserAccount(input: CreateUserAccountInput): Promise<CreateUserAccountResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(ACCOUNTS_BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 409) return { status: 'username_taken' }
  if (res.status === 422) return { status: 'weak_password' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<CreateUserAccountData>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export interface UpdateUserAccountInput {
  username?: string
  name?: string
  email?: string | null
  version: number
}

export type UpdateUserAccountResult =
  | { status: 'success' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'username_taken' }
  | { status: 'conflict' }
  | { status: 'error' }

export async function updateUserAccount(
  accountId: string,
  input: UpdateUserAccountInput,
): Promise<UpdateUserAccountResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${ACCOUNTS_BASE}/${encodeURIComponent(accountId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (res.status === 409) {
    const body = await safeJson<{ code?: string }>(res)
    return { status: body?.code === 'IDENTITY.USERNAME_ALREADY_EXISTS' ? 'username_taken' : 'conflict' }
  }
  if (!res.ok) return { status: 'error' }
  return { status: 'success' }
}

export type ChangeAccountRoleResult =
  | { status: 'success'; data: { role: AdministrableRole } }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error' }

export async function changeAccountRole(accountId: string, role: AdministrableRole): Promise<ChangeAccountRoleResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${ACCOUNTS_BASE}/${encodeURIComponent(accountId)}/role`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<{ role: AdministrableRole }>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export type ToggleAccountStatusAction = 'activate' | 'deactivate' | 'block' | 'unblock'

export type ToggleAccountStatusResult =
  | { status: 'success'; data: { status: AccountStatusName } }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error' }

export async function toggleAccountStatus(
  accountId: string,
  action: ToggleAccountStatusAction,
): Promise<ToggleAccountStatusResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${ACCOUNTS_BASE}/${encodeURIComponent(accountId)}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<{ status: AccountStatusName }>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export type ResetAccountPasswordResult =
  | { status: 'success'; data: { temporaryPassword: string } }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error' }

/** Reaproveita o endpoint administrativo já existente `PATCH /api/auth/admin/reset-password` (body `{ targetUserId }`), sem novo contrato. */
export async function resetAccountPassword(accountId: string): Promise<ResetAccountPasswordResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${AUTH_BASE}/admin/reset-password`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetUserId: accountId }),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<{ temporaryPassword: string }>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export interface AccountSessionSummary {
  sessionId: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
  deviceInfo?: string
}

export type ListAccountSessionsResult =
  | { status: 'success'; data: AccountSessionSummary[] }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error' }

export async function listAccountSessions(accountId: string): Promise<ListAccountSessionsResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${ACCOUNTS_BASE}/${encodeURIComponent(accountId)}/sessions`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<AccountSessionSummary[]>(res)
  if (!Array.isArray(body)) return { status: 'error' }
  return { status: 'success', data: body }
}

export type RevokeAccountSessionResult = 'success' | 'not_found' | 'forbidden' | 'error'

export async function revokeAccountSession(accountId: string, sessionId: string): Promise<RevokeAccountSessionResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(
      `${ACCOUNTS_BASE}/${encodeURIComponent(accountId)}/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' },
    )
  } catch {
    return 'error'
  }
  if (res.status === 403) return 'forbidden'
  if (res.status === 404) return 'not_found'
  if (!res.ok) return 'error'
  return 'success'
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

const VALID_ROLES = new Set(['ADMIN', 'USER'])
const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'BLOCKED'])

function isUserAccountListItem(value: unknown): value is UserAccountListItem {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.userId === 'string' &&
    typeof entry.username === 'string' &&
    typeof entry.name === 'string' &&
    (entry.email === null || typeof entry.email === 'string') &&
    typeof entry.role === 'string' &&
    VALID_ROLES.has(entry.role) &&
    typeof entry.status === 'string' &&
    VALID_STATUSES.has(entry.status)
  )
}

function isUserAccountsPage(value: unknown): value is UserAccountsPage {
  if (typeof value !== 'object' || value === null) return false
  const page = value as Record<string, unknown>
  if (!Array.isArray(page.data) || !page.data.every(isUserAccountListItem)) return false
  const meta = page.meta as Record<string, unknown> | undefined
  return (
    typeof meta === 'object' &&
    meta !== null &&
    typeof meta.page === 'number' &&
    typeof meta.pageSize === 'number' &&
    typeof meta.total === 'number' &&
    typeof meta.totalPages === 'number'
  )
}
