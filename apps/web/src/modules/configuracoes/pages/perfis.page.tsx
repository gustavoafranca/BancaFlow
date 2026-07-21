'use client'

import { useTheme } from '@/shared/theme/theme-provider'
import { RolePermissionsMatrix } from '../components/role-permissions-matrix'

/** Sub-rota `/configuracoes/perfis` — o gate de permissão vive em `ConfiguracoesLayout`. */
export function PerfisPage() {
  const { c } = useTheme()
  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: c.text, marginBottom: 6 }}>
        Perfis de Acesso
      </h1>
      <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6, marginBottom: 20 }}>
        Consulte quais ações cada papel autoriza. Somente leitura — não há edição de permissões nesta fase.
      </p>
      <RolePermissionsMatrix />
    </div>
  )
}
