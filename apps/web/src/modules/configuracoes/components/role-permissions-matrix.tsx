'use client'

import { useTheme } from '@/shared/theme/theme-provider'
import { roleLabel } from '@/shared/lib/role.util'
import type { AccountRoleName } from '@/shared/api/auth.client'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion'
import { useRolePermissions } from '../hooks/use-role-permissions'
import { IcoZap } from './icons'

const ROLES: AccountRoleName[] = ['OWNER', 'ADMIN', 'USER']

/**
 * Seção somente leitura "Perfis de Acesso": espelha a matriz autoritativa
 * papel × permissão vinda do Backend (`hasPermission`/`RolePermissionMap`).
 * Sem nenhum toggle editável — não há UI de administração de permissões
 * nesta fase (ver openspec/changes/establish-authoritative-role-permissions).
 * Agrupada por capability em `Accordion` (tarefa 5.2): só o primeiro grupo
 * inicia aberto, o resto fica recolhido — a matriz completa é longa demais
 * para caber expandida de uma vez.
 */
export function RolePermissionsMatrix() {
  const { c } = useTheme()
  const { state, refetch } = useRolePermissions()

  const card: React.CSSProperties = {
    background: c.card,
    border: `1px solid ${c.cardB}`,
    borderRadius: 16,
    padding: 24,
  }

  if (state.status === 'loading') {
    return (
      <div style={card}>
        <div role="status" aria-live="polite" style={{ color: c.muted, fontSize: 13 }}>
          Carregando perfis de acesso...
        </div>
      </div>
    )
  }

  if (state.status === 'forbidden') {
    return (
      <div style={card}>
        <div role="status" style={{ color: c.muted, fontSize: 13 }}>
          Apenas o Proprietário pode consultar os perfis de acesso.
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={card}>
        <div
          role="alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: 'var(--destructive)', fontSize: 13 }}
        >
          <span>Não foi possível carregar os perfis de acesso agora.</span>
          <button
            type="button"
            onClick={() => void refetch()}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--destructive-border)',
              background: 'transparent',
              color: 'var(--destructive)',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const capabilities = state.data.capabilities

  if (capabilities.length === 0) {
    return (
      <div style={card}>
        <div role="status" style={{ color: c.muted, fontSize: 13 }}>
          Nenhuma permissão cadastrada no catálogo ainda.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <p style={{ fontSize: 12.5, color: c.text, lineHeight: 1.6, marginBottom: 10 }}>
          <strong>Proprietário</strong>, <strong>Administrador</strong> e <strong>Operador</strong> são papéis fixos
          desta versão — não são cadastros editáveis, e nenhuma permissão pode ser concedida individualmente.
        </p>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: c.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ color: c.green, fontWeight: 700 }}>✓</span> Permitido
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden>—</span> Não autorizado
          </span>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={[capabilities[0].capability]}>
        {capabilities.map((capability) => (
          <div key={capability.capability} style={card}>
            <AccordionItem value={capability.capability} className="border-b-0">
              <AccordionTrigger>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: c.glow,
                      border: `1px solid ${c.glowB}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: c.green,
                      flexShrink: 0,
                    }}
                  >
                    {IcoZap}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{capability.label}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <div role="table" aria-label={`Permissões de ${capability.label}`} style={{ width: '100%', minWidth: 480 }}>
                    <div
                      role="row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr repeat(3, 90px)',
                        gap: 8,
                        padding: '8px 0',
                        borderBottom: `1px solid ${c.cardBL}`,
                      }}
                    >
                      <span role="columnheader" style={{ fontSize: 11, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Permissão
                      </span>
                      {ROLES.map((role) => (
                        <span
                          key={role}
                          role="columnheader"
                          style={{ fontSize: 11, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}
                        >
                          {roleLabel(role)}
                        </span>
                      ))}
                    </div>

                    {capability.permissions.map((permission) => (
                      <div
                        key={permission.key}
                        role="row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr repeat(3, 90px)',
                          gap: 8,
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: `1px solid ${c.cardBL}`,
                        }}
                      >
                        <div role="cell">
                          <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{permission.label}</div>
                          <div style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{permission.description}</div>
                        </div>
                        {ROLES.map((role) => (
                          <div key={role} role="cell" style={{ textAlign: 'center' }}>
                            {permission.roles.includes(role) ? (
                              <span aria-label={`${roleLabel(role)} autorizado`} style={{ color: c.green, fontWeight: 700 }}>
                                ✓
                              </span>
                            ) : (
                              <span aria-label={`${roleLabel(role)} não autorizado`} style={{ color: c.muted }}>
                                —
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </Accordion>
    </div>
  )
}
