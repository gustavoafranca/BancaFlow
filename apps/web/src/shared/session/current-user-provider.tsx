'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, type AuthenticatedUserContext } from '@/shared/api/auth.client'

export type CurrentUserState =
  | { status: 'loading' }
  | { status: 'success'; data: AuthenticatedUserContext }
  | { status: 'error' }

interface CurrentUserContextValue {
  state: CurrentUserState
  /** Refaz `GET /api/auth/me`. Retorna `true` só se a leitura foi bem-sucedida — o chamador NÃO deve considerar a sincronização concluída em `false` (ex.: rede caiu, 401, erro do servidor). */
  refresh: () => Promise<boolean>
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

/**
 * Fonte única do contexto de exibição do usuário autenticado (`GET
 * /api/auth/me`), escopada à árvore da sessão privada (design.md, Decisão 5).
 * Busca uma vez ao montar e expõe `refresh()` para que qualquer consumidor
 * (shell/navbar, `/perfil`) resincronize a partir da mesma fonte após uma
 * mutação (ex.: `PATCH /api/auth/me`) — nunca fabricando localmente um estado
 * atualizado. Escopado ao layout privado: remonta (e portanto reinicia) a
 * cada troca de sessão (logout/login), sem estado residual entre contas.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentUserState>({ status: 'loading' })

  // Stale-while-revalidate: se já havia um `success` carregado, uma
  // resincronização (`refresh()`) que falhe (rede, 401, 500) NÃO deve apagar
  // o último dado autoritativo conhecido — do contrário, qualquer consumidor
  // que dependa de `status === 'success'` (ex.: o formulário de `/perfil` em
  // edição) desmontaria no meio de um fluxo já validado. `error` é reservado
  // para quando não há nenhum dado prévio bem-sucedido (falha na carga inicial).
  const applyResult = useCallback((result: Awaited<ReturnType<typeof getCurrentUser>>) => {
    if (result.status === 'success') {
      setState({ status: 'success', data: result.data })
      return true
    }
    setState((prev) => (prev.status === 'success' ? prev : { status: 'error' }))
    return false
  }, [])

  const refresh = useCallback(async () => {
    const result = await getCurrentUser()
    return applyResult(result)
  }, [applyResult])

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((result) => {
      if (cancelled) return
      applyResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [applyResult])

  return <CurrentUserContext.Provider value={{ state, refresh }}>{children}</CurrentUserContext.Provider>
}

export function useCurrentUserContext(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) {
    throw new Error('useCurrentUserContext deve ser usado dentro de um CurrentUserProvider')
  }
  return ctx
}
