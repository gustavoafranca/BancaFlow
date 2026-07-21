'use client'

import { useCallback, useEffect, useState } from 'react'
import { listAccountSessions, revokeAccountSession, type AccountSessionSummary } from '../data/accounts.client'

export type AccountSessionsState =
  | { status: 'loading' }
  | { status: 'success'; data: AccountSessionSummary[] }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'error' }

export type RevokeAccountSessionOutcome = 'success' | 'not_found' | 'forbidden' | 'error'

/**
 * Sessões de uma conta de terceiro (`GET/DELETE /api/accounts/:id/sessions`).
 * `revoke()` sempre recarrega a partir do Backend — nunca remove uma sessão
 * da lista local por suposição otimista (mesmo padrão de `useSessions`, aba
 * Segurança de `/perfil`).
 */
export function useAccountSessions(accountId: string | null) {
  const [state, setState] = useState<AccountSessionsState>({ status: 'loading' })

  // Ajusta o estado para "loading" durante a própria renderização quando o
  // `accountId` muda, em vez de chamar `setState` de forma síncrona dentro do
  // efeito (proibido por `react-hooks/set-state-in-effect`).
  const [lastAccountId, setLastAccountId] = useState(accountId)
  if (accountId !== lastAccountId) {
    setLastAccountId(accountId)
    setState({ status: 'loading' })
  }

  const refetch = useCallback(async () => {
    if (!accountId) return
    const result = await listAccountSessions(accountId)
    setState(result)
  }, [accountId])

  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    listAccountSessions(accountId).then((result) => {
      if (cancelled) return
      setState(result)
    })
    return () => {
      cancelled = true
    }
  }, [accountId])

  const revoke = useCallback(
    async (sessionId: string): Promise<RevokeAccountSessionOutcome> => {
      if (!accountId) return 'error'
      const outcome = await revokeAccountSession(accountId, sessionId)
      if (outcome === 'success' || outcome === 'not_found') {
        await refetch()
      }
      return outcome
    },
    [accountId, refetch],
  )

  return { state, refetch, revoke }
}
