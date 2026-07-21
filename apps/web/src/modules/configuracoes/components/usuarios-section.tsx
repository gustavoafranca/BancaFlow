'use client'

import { useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { IconPlus, IconSearch, IconChevronRight } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/dialog'
import { roleLabel } from '@/shared/lib/role.util'
import { useUserAccounts } from '../hooks/use-user-accounts'
import { getUserAccount, type UserAccountListItem, type UserAccountDetail, type AdministrableRole, type AccountStatusName } from '../data/accounts.client'
import { UserAccountDrawer } from './user-account-drawer'
import { TemporaryPasswordReveal } from './temporary-password-reveal'
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from './account-status.presentation'

/** Seção "Usuários" de Configurações — administração de contas ADMIN/USER da própria banca. Página fina: toda a lógica vive aqui e nos hooks/clients do módulo. */
export function UsuariosSection() {
  const { c } = useTheme()
  const { state, filters, page, setPage, updateFilters, refetch } = useUserAccounts()

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<UserAccountDetail | null>(null)
  const [createdPassword, setCreatedPassword] = useState<{ username: string; temporaryPassword: string } | null>(null)

  async function openDetail(account: UserAccountListItem) {
    setSelectedAccountId(account.userId)
    const result = await getUserAccount(account.userId)
    if (result.status === 'success') {
      setSelectedAccount(result.data)
    }
  }

  function closeDetail() {
    setSelectedAccountId(null)
    setSelectedAccount(null)
  }

  async function reloadSelected() {
    await refetch()
    if (!selectedAccountId) return
    const result = await getUserAccount(selectedAccountId)
    if (result.status === 'success') {
      setSelectedAccount(result.data)
    } else {
      closeDetail()
    }
  }

  const rows = state.status === 'success' ? state.data.data : []
  const meta = state.status === 'success' ? state.data.meta : null

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: c.text, marginBottom: 6 }}>
            Usuários
          </h1>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6 }}>
            Administre as contas ADMIN e USER da própria banca.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <IconPlus size={15} />
          Novo usuário
        </Button>
      </div>

      <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${c.cardB}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Input
            type="text"
            placeholder="Buscar por nome ou usuário..."
            leftIcon={<IconSearch size={14} />}
            className="max-w-[280px]"
            aria-label="Buscar por nome ou usuário"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
          <Select
            value={filters.role ?? 'ALL'}
            onValueChange={(next) => updateFilters({ role: next === 'ALL' ? undefined : (next as AdministrableRole) })}
          >
            <SelectTrigger aria-label="Filtrar por papel" className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os papéis</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="USER">Usuário</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? 'ALL'}
            onValueChange={(next) => updateFilters({ status: next === 'ALL' ? undefined : (next as AccountStatusName) })}
          >
            <SelectTrigger aria-label="Filtrar por status" className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
              <SelectItem value="BLOCKED">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          {meta && <span style={{ fontSize: 12, color: c.muted, marginLeft: 'auto' }}>{meta.total} contas</span>}
        </div>

        {state.status === 'loading' && (
          <div role="status" aria-live="polite" style={{ padding: 28, color: c.muted, fontSize: 13 }}>
            Carregando usuários...
          </div>
        )}

        {state.status === 'forbidden' && (
          <div role="alert" style={{ padding: 28, color: c.muted, fontSize: 13 }}>
            Você não tem permissão para administrar usuários.
          </div>
        )}

        {state.status === 'error' && (
          <div style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span role="alert" style={{ color: 'var(--destructive)', fontSize: 13 }}>
              Não foi possível carregar os usuários agora.
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              style={{
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
        )}

        {state.status === 'success' && rows.length === 0 && (
          <div style={{ padding: 28, color: c.muted, fontSize: 13 }}>Nenhuma conta encontrada.</div>
        )}

        {state.status === 'success' && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="w-[110px]">Papel</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[40px]" aria-hidden />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((account) => {
                const isSelected = account.userId === selectedAccountId
                return (
                  <TableRow
                    key={account.userId}
                    tabIndex={0}
                    aria-label={`Abrir detalhes de ${account.name}`}
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => void openDetail(account)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void openDetail(account)
                      }
                    }}
                    className={isSelected ? 'bg-accent/50' : undefined}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell style={{ fontWeight: 600, color: c.text }}>{account.name}</TableCell>
                    <TableCell style={{ color: c.sub }}>{account.username}</TableCell>
                    <TableCell>{roleLabel(account.role)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[account.status]}>{STATUS_LABEL[account.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <IconChevronRight size={14} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {meta && meta.totalPages > 1 && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: `1px solid ${c.cardB}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={pagerBtnStyle(c, page <= 1)}
            >
              Anterior
            </button>
            <span style={{ fontSize: 12, color: c.muted }}>
              Página {meta.page} de {meta.totalPages} · {meta.total} contas
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              style={pagerBtnStyle(c, page >= meta.totalPages)}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      <UserAccountDrawer
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => {
          setCreatedPassword({ username: created.username, temporaryPassword: created.temporaryPassword })
          void refetch()
        }}
      />

      <UserAccountDrawer
        mode="detail"
        account={selectedAccount}
        open={selectedAccountId !== null}
        onOpenChange={(open) => !open && closeDetail()}
        onMutated={() => void reloadSelected()}
      />

      {/* Resultado da criação — senha temporária exibida uma única vez. */}
      <Dialog open={createdPassword !== null} onOpenChange={(open) => !open && setCreatedPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conta criada</DialogTitle>
            <DialogDescription>
              Compartilhe a senha temporária de {createdPassword?.username} com segurança — ela não poderá ser
              recuperada depois de fechar esta janela.
            </DialogDescription>
          </DialogHeader>
          <div style={{ padding: '0 20px 16px' }}>
            {createdPassword && <TemporaryPasswordReveal value={createdPassword.temporaryPassword} />}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setCreatedPassword(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function pagerBtnStyle(c: ReturnType<typeof useTheme>['c'], disabled: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: 8,
    border: `1px solid ${c.cardB}`,
    background: 'transparent',
    color: disabled ? c.muted : c.sub,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit',
  }
}
