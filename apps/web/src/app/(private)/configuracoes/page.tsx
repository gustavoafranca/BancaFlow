'use client'

import { redirect } from 'next/navigation'

// `/configuracoes` redireciona para a primeira seção — hoje Usuários e
// Perfis de acesso compartilham a mesma `PermissionKey`
// (`identity.accounts.list`, gate em `ConfiguracoesLayout`), então não há
// ainda um cenário de "primeira seção acessível" divergente por item.
export default function Page() {
  redirect('/configuracoes/usuarios')
}
