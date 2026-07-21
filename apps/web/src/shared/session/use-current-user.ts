'use client'

import type { AuthenticatedUserContext } from '@/shared/api/auth.client'
import { useCurrentUserContext } from './current-user-provider'

export type CurrentUserState =
  | { status: 'loading'; refreshCurrentUser: () => Promise<boolean> }
  | { status: 'success'; data: AuthenticatedUserContext; refreshCurrentUser: () => Promise<boolean> }
  | { status: 'error'; refreshCurrentUser: () => Promise<boolean> }

/**
 * Contexto de exibição do usuário autenticado (`GET /api/auth/me`), lido do
 * `CurrentUserProvider` do layout privado — fonte única compartilhada entre
 * shell/navbar e `/perfil` (design.md, Decisão 5). Mesma interface pública já
 * consumida por `app-navbar.tsx`/`perfil.page.tsx` (`status`/`data`), com o
 * adicional `refreshCurrentUser()` para resincronizar após uma mutação (ex.:
 * `PATCH /api/auth/me`) sem fabricar localmente um estado atualizado.
 * `refreshCurrentUser()` resolve para `true` só quando o `GET` subsequente
 * teve sucesso — o chamador NÃO deve considerar a sincronização concluída em
 * `false` (rede caiu, 401, erro do servidor).
 * Enquanto carrega ou em caso de erro, o chamador deve mostrar um estado
 * vazio/skeleton — nunca um valor fabricado.
 */
export function useCurrentUser(): CurrentUserState {
  const { state, refresh } = useCurrentUserContext()
  return state.status === 'success'
    ? { status: 'success', data: state.data, refreshCurrentUser: refresh }
    : { status: state.status, refreshCurrentUser: refresh }
}
