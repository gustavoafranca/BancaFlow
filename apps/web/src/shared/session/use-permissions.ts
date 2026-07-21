'use client'

import { usePermissionsContext } from './permissions-provider'

/**
 * `true` somente quando a permissão foi confirmada pelo Backend para o ator
 * autenticado. Enquanto carrega ou em erro, retorna `false` — a UI oculta o
 * controle correspondente, nunca assume acesso otimisticamente.
 */
export function useHasPermission(key: string): boolean {
  const { state } = usePermissionsContext()
  return state.status === 'success' && state.data.permissions.some((p) => p.key === key)
}
