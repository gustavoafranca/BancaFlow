// Silent refresh: quando o access token expira, tentamos rotacionar a sessão
// via `POST /api/auth/refresh` (o refresh token viaja no cookie HttpOnly com
// `Path=/api/auth/refresh`). Nada é lido/escrito em localStorage.

const REFRESH_ENDPOINT = '/api/auth/refresh'

let inFlight: Promise<boolean> | null = null

/** Tenta renovar a sessão. Coalesce chamadas concorrentes numa única request. */
export async function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch(REFRESH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
      })
      return res.ok
    } catch {
      return false
    } finally {
      // Libera o lock no próximo tick para permitir novo refresh futuro.
      setTimeout(() => {
        inFlight = null
      }, 0)
    }
  })()
  return inFlight
}

/** Redireciona para o login sinalizando sessão expirada (somente no browser). */
export function redirectToLoginExpired(): void {
  if (typeof window !== 'undefined') {
    window.location.assign('/login?expired=1')
  }
}

/**
 * Executa um fetch e, ao receber 401, tenta um silent refresh e repete UMA vez.
 * Se o refresh falhar, redireciona para `/login?expired=1`.
 */
export async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const doFetch = () => fetch(input, { ...init, credentials: 'include' })

  let res = await doFetch()
  if (res.status !== 401) return res

  const refreshed = await refreshSession()
  if (!refreshed) {
    redirectToLoginExpired()
    return res
  }

  res = await doFetch()
  if (res.status === 401) {
    redirectToLoginExpired()
  }
  return res
}
