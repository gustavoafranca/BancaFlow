'use client'

import { useCallback, useEffect, useState } from 'react'
import { listSessions, revokeSession, type SessionSummary } from '@/shared/api/auth.client'

export type SessionsState =
  | { status: 'loading' }
  | { status: 'success'; data: SessionSummary[] }
  | { status: 'error' }

export type RevokeOutcome = 'success' | 'not_found' | 'unauthenticated' | 'error'

/**
 * Estado da listagem de sessões ativas do próprio ator (aba Segurança de
 * `/perfil`). Busca uma vez ao montar; `refetch()`/`revoke()` sempre
 * recarregam a listagem autoritativa via `GET /api/auth/sessions` — nunca
 * removem uma sessão da lista local por suposição otimista (design.md, D4).
 */
export function useSessions() {
  const [state, setState] = useState<SessionsState>({ status: 'loading' })

  const refetch = useCallback(async () => {
    const result = await listSessions()
    setState(result.status === 'success' ? { status: 'success', data: result.data } : { status: 'error' })
    return result.status === 'success'
  }, [])

  useEffect(() => {
    let cancelled = false
    listSessions().then((result) => {
      if (cancelled) return
      setState(result.status === 'success' ? { status: 'success', data: result.data } : { status: 'error' })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const revoke = useCallback(
    async (sessionId: string): Promise<RevokeOutcome> => {
      const result = await revokeSession(sessionId)
      if (result.status === 'success' || result.status === 'not_found') {
        // A sessão já não deve mais aparecer — recarrega o estado autoritativo
        // em vez de removê-la localmente por suposição.
        await refetch()
      }
      return result.status
    },
    [refetch],
  )

  return { state, refetch, revoke }
}
