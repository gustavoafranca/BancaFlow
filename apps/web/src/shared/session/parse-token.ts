import type { AccessTokenClaims, Session } from './session.types'

// Decodifica APENAS o payload de um JWT (base64url) — sem verificar a
// assinatura. A verificação criptográfica é responsabilidade autoritativa do
// backend. Aqui o objetivo é somente ler claims para decisões de UI/roteamento
// (proxy e layout server). Uso exclusivo no lado servidor.

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  // `atob` existe no runtime Node moderno (Next 16 usa Node.js no proxy) e no Edge.
  const binary = atob(padded)
  // Reconstrói UTF-8 a partir dos bytes.
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Faz o parse do payload do access token. Retorna `null` se malformado. */
export function parseAccessToken(token: string | undefined | null): AccessTokenClaims | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]!)) as Partial<AccessTokenClaims>
    if (typeof payload.sub !== 'string' || typeof payload.bancaId !== 'string') return null
    if (typeof payload.sessionId !== 'string' || typeof payload.role !== 'string') return null
    return {
      sub: payload.sub,
      bancaId: payload.bancaId,
      sessionId: payload.sessionId,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword === true,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
    }
  } catch {
    return null
  }
}

/** Considera o token expirado quando `exp` (epoch s) já passou. */
export function isTokenExpired(claims: AccessTokenClaims | null, nowMs = Date.now()): boolean {
  if (!claims?.exp) return false
  return claims.exp * 1000 <= nowMs
}

/** Converte claims em uma projeção de sessão do Web. */
export function toSession(claims: AccessTokenClaims): Session {
  return {
    userId: claims.sub,
    bancaId: claims.bancaId,
    sessionId: claims.sessionId,
    role: claims.role,
    mustChangePassword: claims.mustChangePassword,
  }
}
