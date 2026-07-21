import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'

// Cliente HTTP de autenticação. Todas as chamadas usam `credentials: 'include'`
// para enviar/receber os cookies HttpOnly emitidos pelo backend. O Web nunca
// lê tokens diretamente (são HttpOnly) nem envia `codigoBanca` no body — o
// tenant é resolvido pelo host/subdomínio no backend.

const BASE = '/api/auth'

export interface LoginInput {
  username: string
  password: string
}

export type LoginResult =
  | { status: 'success'; mustChangePassword: boolean }
  | { status: 'invalid_credentials' }
  | { status: 'account_locked' }
  | { status: 'invalid_banca' }
  | { status: 'error' }

interface LoginResponseBody {
  mustChangePassword?: boolean
  code?: string
}

/** POST /api/auth/login — o backend define os cookies de sessão na resposta. */
export async function login(input: LoginInput): Promise<LoginResult> {
  let res: Response
  try {
    res = await fetch(`${BASE}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: input.username, password: input.password }),
    })
  } catch {
    return { status: 'error' }
  }

  if (res.ok) {
    const body = await safeJson<LoginResponseBody>(res)
    return { status: 'success', mustChangePassword: body?.mustChangePassword === true }
  }

  const body = await safeJson<LoginResponseBody>(res)
  const code = body?.code

  // Mensagens seguras e genéricas: nunca revelar existência de conta/banca.
  if (res.status === 423 || code === 'ACCOUNT_LOCKED') return { status: 'account_locked' }
  if (res.status === 401 || code === 'INVALID_CREDENTIALS') return { status: 'invalid_credentials' }
  if (
    code === 'BANCA_NOT_FOUND' ||
    code === 'BANCA_INACTIVE' ||
    res.status === 404 ||
    res.status === 400
  ) {
    return { status: 'invalid_banca' }
  }
  return { status: 'error' }
}

/** POST /api/auth/refresh — rotaciona os cookies de sessão. */
export async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
    })
    return res.ok
  } catch {
    return false
  }
}

/** POST /api/auth/logout — limpa os cookies da sessão atual. */
export async function logout(): Promise<boolean> {
  const res = await fetchWithRefresh(`${BASE}/logout`, { method: 'POST' })
  return res.ok
}

/** POST /api/auth/logout-all — encerra todas as sessões do usuário. */
export async function logoutAll(): Promise<boolean> {
  const res = await fetchWithRefresh(`${BASE}/logout-all`, { method: 'POST' })
  return res.ok
}

export interface ChangePasswordInput {
  newPassword: string
  /** senha atual: SEMPRE obrigatória — este fluxo é exclusivamente voluntário. */
  currentPassword: string
}

export type ChangePasswordResult =
  | { status: 'success' }
  | { status: 'invalid' }
  | { status: 'wrong_current_password' }
  | { status: 'error' }

interface ErrorResponseBody {
  /** O `ApiExceptionFilter` global do Backend não expõe um `code` solto — o
   * código de domínio autoritativo vem sempre como o primeiro (e único)
   * elemento de `message` (ex.: `{ message: ["IDENTITY.CURRENT_PASSWORD_INCORRECT"] }`). */
  message?: string[]
}

/**
 * PATCH /api/auth/password — troca VOLUNTÁRIA de senha (exige `currentPassword`).
 * Backend passa a bloquear (403) quando a sessão tem `mustChangePassword=true`;
 * nesse caso use `mandatoryPasswordChange()`. Backend renova o access token
 * (novo cookie) na própria resposta em caso de sucesso.
 *
 * Distingue `wrong_current_password` (`400 IDENTITY.CURRENT_PASSWORD_INCORRECT`)
 * de `invalid` (ex.: senha nova fraca) pelo código autoritativo do corpo da
 * resposta, não só pelo status HTTP — os dois retornam `400`.
 */
export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/password`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.ok) return { status: 'success' }
  if (res.status === 400 || res.status === 422) {
    const body = await safeJson<ErrorResponseBody>(res)
    if (body?.message?.[0] === 'IDENTITY.CURRENT_PASSWORD_INCORRECT') {
      return { status: 'wrong_current_password' }
    }
    return { status: 'invalid' }
  }
  return { status: 'error' }
}

export interface MandatoryPasswordChangeInput {
  newPassword: string
}

/**
 * PATCH /api/auth/mandatory-password-change — troca OBRIGATÓRIA de senha.
 * Body contém SOMENTE `newPassword`: a autorização é feita pelo backend via
 * claim `mustChangePassword` do token da sessão atual, nunca por um booleano
 * enviado pelo cliente. Só funciona quando a sessão tem `mustChangePassword=true`.
 * Em sucesso, o backend reemite o access token (`mustChangePassword=false`) via
 * `Set-Cookie` na própria resposta.
 */
export async function mandatoryPasswordChange(
  input: MandatoryPasswordChangeInput,
): Promise<ChangePasswordResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/mandatory-password-change`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.ok) return { status: 'success' }
  if (res.status === 400 || res.status === 422) return { status: 'invalid' }
  return { status: 'error' }
}

export type AccountRoleName = 'OWNER' | 'ADMIN' | 'USER'

/** Espelha `AuthenticatedUserContextDto` de `@bancaflow/identity` (`GET /api/auth/me`). */
export interface AuthenticatedUserContext {
  userId: string
  username: string
  name: string
  email: string | null
  role: AccountRoleName
  /** Versionamento otimista corrente do `UserAccount` — usado para `PATCH /api/auth/me` (CAS). */
  version: number
  banca: {
    bancaId: string
    codigoBanca: string
    name: string
  }
}

export type CurrentUserResult =
  | { status: 'success'; data: AuthenticatedUserContext }
  | { status: 'error' }

/**
 * GET /api/auth/me — contexto de exibição do próprio usuário autenticado
 * (nome, usuário, e-mail, papel e banca). Nunca fabricar esses dados no
 * client: se a chamada falhar, o chamador deve tratar como ausência (sem
 * placeholder hardcoded).
 */
export async function getCurrentUser(): Promise<CurrentUserResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/me`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<AuthenticatedUserContext>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export interface UpdateOwnProfileInput {
  name?: string
  email?: string | null
  /** `version` lido de um `GET /api/auth/me` anterior — obrigatório para o CAS. */
  version: number
}

export type UpdateOwnProfileResult =
  | { status: 'success' }
  | { status: 'invalid' }
  | { status: 'unauthenticated' }
  | { status: 'conflict' }
  | { status: 'error' }

/**
 * PATCH /api/auth/me — atualização do próprio nome/e-mail com concorrência
 * otimista (`version`). Sucesso é uma confirmação mínima (`{ success: true }`);
 * o chamador deve refazer `GET /api/auth/me` (via `refreshCurrentUser()`) para
 * obter nome/e-mail/`version` autoritativos, nunca incrementar `version`
 * localmente.
 */
export async function updateOwnProfile(input: UpdateOwnProfileInput): Promise<UpdateOwnProfileResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/me`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.ok) return { status: 'success' }
  if (res.status === 401) return { status: 'unauthenticated' }
  if (res.status === 409) return { status: 'conflict' }
  if (res.status === 400 || res.status === 422) return { status: 'invalid' }
  return { status: 'error' }
}

/** Espelha `SessionInfoDto` de `@bancaflow/identity` (`GET /api/auth/sessions`). */
export interface SessionSummary {
  sessionId: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
  deviceInfo?: string
}

export type ListSessionsResult =
  | { status: 'success'; data: SessionSummary[] }
  | { status: 'unauthenticated' }
  | { status: 'error' }

/**
 * GET /api/auth/sessions — sessões ativas do próprio ator autenticado.
 * `isCurrent` já vem calculado pelo Backend a partir do `AuthContext`; o Web
 * nunca decodifica o token HttpOnly para inferir isso.
 */
export async function listSessions(): Promise<ListSessionsResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/sessions`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 401) return { status: 'unauthenticated' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<SessionSummary[]>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

export type RevokeSessionResult =
  | { status: 'success' }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'error' }

/**
 * DELETE /api/auth/sessions/:sessionId — encerra uma sessão específica do
 * próprio ator. Uma sessão-alvo já inexistente/de outro ator retorna `404
 * IDENTITY.TARGET_SESSION_NOT_FOUND` (não revela existência cross-tenant) —
 * um status inequívoco, distinto de `401` (autenticação do próprio ator).
 * Isso evita que `fetchWithRefresh` interprete a ausência da sessão-alvo como
 * sessão expirada e redirecione incorretamente para `/login?expired=1`.
 */
export async function revokeSession(sessionId: string): Promise<RevokeSessionResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })
  } catch {
    return { status: 'error' }
  }
  if (res.ok) return { status: 'success' }
  if (res.status === 404) return { status: 'not_found' }
  if (res.status === 401) return { status: 'unauthenticated' }
  return { status: 'error' }
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}
