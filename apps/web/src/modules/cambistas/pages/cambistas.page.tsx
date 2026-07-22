'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { useHasPermission } from '@/shared/session/use-permissions'
import { IconPlus, IconUsers, IconSearch } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table'
import {
  list,
  getById,
  type BettingAgentListItem,
  type BettingAgentDetail,
  type PaginatedResult,
} from '../data/betting-agent.client'
import { BettingAgentDrawer } from '../components/betting-agent-drawer'

const PAGE_SIZE = 20

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'forbidden' }
  | { status: 'success'; page: PaginatedResult<BettingAgentListItem> }

export function CambistasPage() {
  const { c } = useTheme()
  const canCreate = useHasPermission('participants.betting-agents.create')

  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<BettingAgentDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await list({ search: appliedSearch || undefined, page, pageSize: PAGE_SIZE })
    if (result.status === 'success') setState({ status: 'success', page: result.data })
    else if (result.status === 'forbidden') setState({ status: 'forbidden' })
    else setState({ status: 'error' })
  }, [appliedSearch, page])

  useEffect(() => {
    void load()
  }, [load])

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
  }

  async function openDetail(id: string) {
    const result = await getById(id)
    if (result.status === 'success') {
      setDetail(result.data)
      setDetailOpen(true)
    }
  }

  async function refreshDetail() {
    void load()
    if (!detail) return
    const result = await getById(detail.id)
    if (result.status === 'success') setDetail(result.data)
  }

  // Calcula stats com base nos dados carregados
  const stats =
    state.status === 'success'
      ? {
          total: state.page.meta.total,
          ativos: state.page.data.filter((x) => x.status === 'ACTIVE').length,
          inativos: state.page.data.filter((x) => x.status === 'INACTIVE').length,
          taloes: state.page.meta.total,
        }
      : { total: 0, ativos: 0, inativos: 0, taloes: 0 }

  return (
    <div style={{ padding: '26px 28px' }}>
      {/* Page header com descrição */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: c.text, marginBottom: 5 }}>
            Cambistas
          </h1>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6 }}>
            Gerencie cambistas, talões, vínculos e remunerações.
          </p>
        </div>
        {canCreate && (
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <IconPlus />
            Adicionar Cambista
          </Button>
        )}
      </div>

      {/* Cards de estatísticas */}
      {state.status !== 'loading' && state.status !== 'error' && state.status !== 'forbidden' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
          <StatCard
            icon={<IconUsers size={18} />}
            iconBg={c.glow}
            iconBorder={c.glowB}
            iconColor={c.green}
            value={stats.total}
            valueColor={c.text}
            label="Total"
          />
          <StatCard
            icon={<IconAtivo />}
            iconBg={c.glow}
            iconBorder={c.glowB}
            iconColor={c.green}
            value={stats.ativos}
            valueColor={c.green}
            label="Ativos"
          />
          <StatCard
            icon={<IconInativo />}
            iconBg="rgba(224,85,85,0.1)"
            iconBorder="rgba(224,85,85,0.22)"
            iconColor="#E05555"
            value={stats.inativos}
            valueColor="#E05555"
            label="Inativos"
          />
          <StatCard
            icon={<IconTalaoStat />}
            iconBg="rgba(91,143,212,0.12)"
            iconBorder="rgba(91,143,212,0.22)"
            iconColor="#5B8FD4"
            value={stats.taloes}
            valueColor="#5B8FD4"
            label="Talões"
          />
        </div>
      )}

      {/* Table card */}
      <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, overflow: 'hidden' }}>
        {/* Search bar integrada no card */}
        {state.status !== 'forbidden' && (
          <form
            onSubmit={applySearch}
            style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${c.cardB}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.muted }}>
                <IconSearch size={14} />
              </span>
              <Input
                aria-label="Buscar por código, nome ou apelido"
                placeholder="Buscar por código, nome ou apelido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 34, maxWidth: '100%' }}
              />
            </div>
            <span style={{ fontSize: 12, color: c.muted, whiteSpace: 'nowrap' }}>
              {stats.total} cambista{stats.total === 1 ? '' : 's'} cadastrado{stats.total === 1 ? '' : 's'}
            </span>
          </form>
        )}

        {/* Content */}
        {state.status === 'loading' && <StateMessage>Carregando Cambistas…</StateMessage>}
        {state.status === 'error' && (
          <StateMessage>
            Não foi possível carregar agora.{' '}
            <Button variant="ghost" onClick={() => void load()}>
              Tentar novamente
            </Button>
          </StateMessage>
        )}
        {state.status === 'forbidden' && (
          <StateMessage>Você não tem acesso ao catálogo de Cambistas.</StateMessage>
        )}
        {state.status === 'success' && state.page.data.length === 0 && (
          <StateMessage>
            {appliedSearch ? 'Nenhum Cambista encontrado para a busca.' : 'Nenhum Cambista cadastrado ainda.'}
          </StateMessage>
        )}
        {state.status === 'success' && state.page.data.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Apelido</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.page.data.map((agent) => (
                  <TableRow
                    key={agent.id}
                    onClick={() => void openDetail(agent.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{agent.code}</TableCell>
                    <TableCell>{agent.name ?? '—'}</TableCell>
                    <TableCell>{agent.nickname ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {agent.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={state.page.meta.page}
              totalPages={state.page.meta.totalPages}
              total={state.page.meta.total}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </div>

      {canCreate && (
        <BettingAgentDrawer mode="create" open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void load()} />
      )}
      <BettingAgentDrawer
        mode="detail"
        agent={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onMutated={() => void refreshDetail()}
      />
    </div>
  )

  function StateMessage({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: c.muted, fontSize: 14 }}>{children}</div>
    )
  }
}

function StatCard({
  icon,
  iconBg,
  iconBorder,
  iconColor,
  value,
  valueColor,
  label,
}: {
  icon: React.ReactNode
  iconBg: string
  iconBorder: string
  iconColor: string
  value: number
  valueColor: string
  label: string
}) {
  const { c } = useTheme()
  return (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.cardB}`,
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          background: iconBg,
          border: `1px solid ${iconBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: valueColor, lineHeight: 1.15 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted, marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const { c } = useTheme()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: `1px solid ${c.cardB}`,
        fontSize: 13,
        color: c.muted,
      }}
    >
      <span>
        {total} Cambista{total === 1 ? '' : 's'} · página {page} de {Math.max(1, totalPages)}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" disabled={page <= 1} onClick={onPrev}>
          Anterior
        </Button>
        <Button variant="ghost" disabled={page >= totalPages} onClick={onNext}>
          Próxima
        </Button>
      </div>
    </div>
  )
}

// Icons simples (substituindo os do components/icons que foram removidos)
function IconAtivo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.2" />
      <circle cx="8" cy="8" r="3" fill="currentColor" />
    </svg>
  )
}

function IconInativo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.2" />
      <line x1="6" y1="10" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconTalaoStat() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
