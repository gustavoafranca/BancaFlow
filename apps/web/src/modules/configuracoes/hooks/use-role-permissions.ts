'use client'

import { useCallback, useEffect, useState } from 'react'
import { getRolePermissions, type RolePermissionMatrix } from '../data/access-control.client'

export type RolePermissionsState =
  | { status: 'loading' }
  | { status: 'success'; data: RolePermissionMatrix }
  | { status: 'forbidden' }
  | { status: 'error' }

/**
 * Estado da matriz papel × permissão (seção "Perfis de Acesso" de
 * `/configuracoes`). Busca uma vez ao montar; `refetch()` sempre recarrega a
 * matriz autoritativa via `GET /api/access-control/role-permissions` — nunca
 * fabrica um estado local.
 */
export function useRolePermissions() {
  const [state, setState] = useState<RolePermissionsState>({ status: 'loading' })

  const refetch = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await getRolePermissions()
    setState(result.status === 'success' ? { status: 'success', data: result.data } : { status: result.status })
  }, [])

  useEffect(() => {
    let cancelled = false
    getRolePermissions().then((result) => {
      if (cancelled) return
      setState(result.status === 'success' ? { status: 'success', data: result.data } : { status: result.status })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { state, refetch }
}
