'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listUserAccounts,
  type AdministrableRole,
  type AccountStatusName,
  type UserAccountsPage,
} from '../data/accounts.client'

export type UserAccountsState =
  | { status: 'loading' }
  | { status: 'success'; data: UserAccountsPage }
  | { status: 'forbidden' }
  | { status: 'error' }

export interface UserAccountsFilters {
  search: string
  role?: AdministrableRole
  status?: AccountStatusName
}

const PAGE_SIZE = 20
const EMPTY_FILTERS: UserAccountsFilters = { search: '' }

/**
 * Estado da listagem administrativa de contas (`GET /api/accounts`). Busca
 * a cada mudança de filtro/página. `refetch()` sempre recarrega a partir do
 * Backend — nenhuma mutação (criar/editar/trocar papel/status/senha) altera
 * a lista local por suposição otimista.
 */
export function useUserAccounts() {
  const [filters, setFilters] = useState<UserAccountsFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<UserAccountsState>({ status: 'loading' })

  // Ao invés de "resetar para loading" de forma síncrona dentro do efeito
  // (proibido por `react-hooks/set-state-in-effect`), ajusta o estado durante
  // a própria renderização quando a chave da requisição muda — mesmo padrão
  // recomendado pelo React para "resetar estado quando uma prop muda".
  const requestKey = `${page}|${filters.search}|${filters.role ?? ''}|${filters.status ?? ''}`
  const [lastRequestKey, setLastRequestKey] = useState(requestKey)
  if (requestKey !== lastRequestKey) {
    setLastRequestKey(requestKey)
    setState({ status: 'loading' })
  }

  const fetchPage = useCallback(async (targetPage: number, targetFilters: UserAccountsFilters) => {
    const result = await listUserAccounts({
      page: targetPage,
      pageSize: PAGE_SIZE,
      search: targetFilters.search || undefined,
      role: targetFilters.role,
      status: targetFilters.status,
    })
    if (result.status !== 'success') {
      setState({ status: result.status })
      return
    }
    // Uma mutação (troca de papel/status, remoção implícita por filtro) pode
    // esvaziar a página atual quando ela não é a primeira — nesse caso, a
    // fonte autoritativa já diz quantas páginas existem agora; volta para a
    // última página válida em vez de mostrar uma página vazia "fantasma".
    if (result.data.data.length === 0 && targetPage > 1 && result.data.meta.totalPages > 0) {
      setPage(result.data.meta.totalPages)
      return
    }
    setState({ status: 'success', data: result.data })
  }, [])

  useEffect(() => {
    let cancelled = false
    listUserAccounts({
      page,
      pageSize: PAGE_SIZE,
      search: filters.search || undefined,
      role: filters.role,
      status: filters.status,
    }).then((result) => {
      if (cancelled) return
      setState(result.status === 'success' ? { status: 'success', data: result.data } : { status: result.status })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `requestKey` já resume `page`/`filters`.
  }, [requestKey])

  const refetch = useCallback(() => fetchPage(page, filters), [fetchPage, page, filters])

  const updateFilters = useCallback((next: Partial<UserAccountsFilters>) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, ...next }))
  }, [])

  return { state, filters, page, setPage, updateFilters, refetch }
}
