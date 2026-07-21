'use client'

import { UsuariosSection } from '../components/usuarios-section'

/** Sub-rota `/configuracoes/usuarios` — o gate de permissão vive em `ConfiguracoesLayout`. */
export function UsuariosPage() {
  return <UsuariosSection />
}
