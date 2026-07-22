'use client'

import { useCallback, useEffect, useState } from 'react'
import { useHasPermission } from '@/shared/session/use-permissions'
import { IconPlus, IconUsers, IconCheck, IconX, IconSearch } from '@/shared/components/icons'
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
import { initials, avatarGradientClass } from '@/shared/lib/format.util'
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
  const canCreate = useHasPermission('participants.betting-agents.create')

  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<BettingAgentDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Reseta para "loading" durante a própria renderização quando busca/página
  // mudam, em vez de dentro do efeito (proibido por
  // `react-hooks/set-state-in-effect`) — mesmo padrão de `useUserAccounts`
  // (`modules/configuracoes/hooks/use-user-accounts.ts`).
  const requestKey = `${appliedSearch}|${page}`
  const [lastRequestKey, setLastRequestKey] = useState(requestKey)
  if (requestKey !== lastRequestKey) {
    setLastRequestKey(requestKey)
    setState({ status: 'loading' })
  }

  const load = useCallback(async () => {
    const result = await list({ search: appliedSearch || undefined, page, pageSize: PAGE_SIZE })
    if (result.status === 'success') setState({ status: 'success', page: result.data })
    else setState({ status: result.status })
  }, [appliedSearch, page])

  useEffect(() => {
    let cancelled = false
    list({ search: appliedSearch || undefined, page, pageSize: PAGE_SIZE }).then((result) => {
      if (cancelled) return
      if (result.status === 'success') setState({ status: 'success', page: result.data })
      else setState({ status: result.status })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `requestKey` já resume `appliedSearch`/`page`.
  }, [requestKey])

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

  // Stats: total é global (`meta.total`); Ativos/Inativos são calculados só a
  // partir da página carregada (`state.page.data`) — agregados globais
  // exigiriam mudança de contrato de backend (fora de escopo desta change),
  // por isso o rótulo do card deixa o escopo "nesta página" explícito em vez
  // de sugerir um total coerente com a paginação.
  const stats =
    state.status === 'success'
      ? {
          total: state.page.meta.total,
          ativos: state.page.data.filter((x) => x.status === 'ACTIVE').length,
          inativos: state.page.data.filter((x) => x.status === 'INACTIVE').length,
        }
      : { total: 0, ativos: 0, inativos: 0 }

  return (
    <div className="p-[26px_28px]">
      <div className="mb-6 flex items-start justify-between gap-5">
        <div>
          <h1 className="mb-1.5 text-[21px] font-extrabold tracking-[-0.025em] text-foreground">
            Cambistas
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Gerencie cambistas, talões, vínculos e remunerações.
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setCreateOpen(true)} className="whitespace-nowrap">
            <IconPlus />
            Adicionar Cambista
          </Button>
        )}
      </div>

      {state.status !== 'loading' && state.status !== 'error' && state.status !== 'forbidden' && (
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
          <StatCard
            icon={<IconUsers size={18} />}
            iconClassName="border-[rgba(0,199,115,0.24)] bg-[rgba(0,199,115,0.11)] text-primary"
            value={stats.total}
            valueClassName="text-foreground"
            label="Total"
          />
          <StatCard
            icon={<IconCheck size={18} />}
            iconClassName="border-[rgba(0,199,115,0.24)] bg-[rgba(0,199,115,0.11)] text-primary"
            value={stats.ativos}
            valueClassName="text-primary"
            label="Ativos"
            caption="nesta página"
          />
          <StatCard
            icon={<IconX size={18} />}
            iconClassName="border-[rgba(224,85,85,0.22)] bg-[rgba(224,85,85,0.1)] text-[#E05555]"
            value={stats.inativos}
            valueClassName="text-[#E05555]"
            label="Inativos"
            caption="nesta página"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {state.status !== 'forbidden' && (
          <form
            onSubmit={applySearch}
            className="flex items-center justify-between gap-3.5 border-b border-border p-[14px_18px]"
          >
            <div className="max-w-[300px] flex-1">
              <Input
                aria-label="Buscar por código, nome ou apelido"
                placeholder="Buscar por código, nome ou apelido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<IconSearch size={14} />}
              />
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {stats.total} cambista{stats.total === 1 ? '' : 's'} cadastrado{stats.total === 1 ? '' : 's'}
            </span>
          </form>
        )}

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
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Apelido</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.page.data.map((agent) => (
                  <TableRow key={agent.id} onClick={() => void openDetail(agent.id)} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          aria-hidden="true"
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarGradientClass(agent.id)}`}
                        >
                          {initials(agent.name ?? agent.nickname ?? agent.code)}
                        </div>
                        <span>{agent.name ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{agent.code}</TableCell>
                    <TableCell>{agent.nickname ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'danger'}>
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
}

function StateMessage({ children }: { children: React.ReactNode }) {
  return <div className="p-[48px_20px] text-center text-sm text-muted-foreground">{children}</div>
}

function StatCard({
  icon,
  iconClassName,
  value,
  valueClassName,
  label,
  caption,
}: {
  icon: React.ReactNode
  iconClassName: string
  value: number
  valueClassName: string
  label: string
  caption?: string
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[14px] border border-border bg-card p-[18px_20px]">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border ${iconClassName}`}
      >
        {icon}
      </div>
      <div>
        <div className={`text-[22px] font-extrabold leading-tight tracking-[-0.04em] ${valueClassName}`}>
          {value}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
          {caption && <span className="normal-case tracking-normal"> · {caption}</span>}
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
  return (
    <div className="flex items-center justify-between border-t border-border p-[12px_16px] text-sm text-muted-foreground">
      <span>
        {total} Cambista{total === 1 ? '' : 's'} · página {page} de {Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
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
