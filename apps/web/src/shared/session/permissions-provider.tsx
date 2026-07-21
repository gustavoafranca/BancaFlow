'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMyPermissions, type OwnEffectivePermissions } from '@/shared/api/permissions.client'

export type PermissionsState =
  | { status: 'loading' }
  | { status: 'success'; data: OwnEffectivePermissions }
  | { status: 'error' }

interface PermissionsContextValue {
  state: PermissionsState
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

/**
 * Fonte única das permissões efetivas do ator autenticado (`GET
 * /api/access-control/me/permissions`), escopada à árvore da sessão privada.
 * Consumida pelo shell (menu) para gatear itens por `PermissionKey`, nunca
 * por papel bruto. O Backend permanece autoritativo: ocultar/exibir aqui é
 * só experiência, nunca o controle de segurança real (ver
 * `settings-capability-visibility`). Enquanto carrega ou em erro, o
 * consumidor deve tratar como "sem a permissão" — nunca assumir acesso.
 */
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PermissionsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getMyPermissions().then((result) => {
      if (cancelled) return
      setState(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <PermissionsContext.Provider value={{ state }}>{children}</PermissionsContext.Provider>
}

export function usePermissionsContext(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    throw new Error('usePermissionsContext deve ser usado dentro de um PermissionsProvider')
  }
  return ctx
}
