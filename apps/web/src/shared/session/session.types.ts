// Tipos de sessão próprios do Web. NÃO reutilizamos cegamente o DTO
// compartilhado antigo do backend; o Web só precisa das claims que trafegam
// no access token (payload JWT) e de uma projeção mínima de sessão.

export type AccountRole = 'OWNER' | 'ADMIN' | 'USER'

/** Claims presentes no payload do access token (cookie HttpOnly). */
export interface AccessTokenClaims {
  /** userId */
  sub: string
  bancaId: string
  sessionId: string
  role: AccountRole
  mustChangePassword: boolean
  /** epoch seconds (opcional; emitido pelo backend) */
  exp?: number
  iat?: number
}

/** Sessão resolvida no servidor a partir das claims. */
export interface Session {
  userId: string
  bancaId: string
  sessionId: string
  role: AccountRole
  mustChangePassword: boolean
}

/** Nomes dos cookies emitidos pelo backend (HttpOnly).
 *  IMPORTANTE: devem coincidir com os nomes usados pelo backend ao emitir
 *  `Set-Cookie`. Ver nota de coordenação no retorno do subagente Web. */
export const ACCESS_TOKEN_COOKIE = 'access_token'
export const REFRESH_TOKEN_COOKIE = 'refresh_token'
