import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'

// Cliente HTTP do catálogo de Cambistas. Espelha os DTOs de
// `@bancaflow/participants` (`/api/participants/betting-agents`) — restrito a
// OWNER/ADMIN na escrita; USER tem lookup read-only. `credentials: 'include'`
// envia os cookies HttpOnly; o Web nunca decide autorização nem envia bancaId
// (o tenant vem do host/token no Backend). A validação autoritativa é do
// Backend; o schema local é só feedback de UX.

const BASE = '/api/participants/betting-agents'

export type BettingAgentStatus = 'ACTIVE' | 'INACTIVE'

export type CompensationPolicyType =
  | 'PERCENTAGE_ON_SALES'
  | 'FIXED_WEEKLY'
  | 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'

export interface CompensationPolicyView {
  type: CompensationPolicyType
  percentage: number | null
  weeklyFixedAmountCents: number | null
  effectiveFrom: string
  effectiveTo: string | null
}

export interface BettingAgentListItem {
  id: string
  code: string
  status: BettingAgentStatus
  name: string | null
  nickname: string | null
  createdAt: string
}

export interface PartyContactView {
  phone: string
  label: string | null
}

export interface PartyAddressView {
  street: string | null
  number: string | null
  neighborhood: string
  city: string
  effectiveFrom: string
  effectiveTo: string | null
}

export interface BettingAgentDetail {
  id: string
  code: string
  status: BettingAgentStatus
  party: {
    id: string
    name: string | null
    nickname: string | null
    contacts: PartyContactView[]
    address: PartyAddressView | null
  }
  policy: CompensationPolicyView
  createdAt: string
}

export interface PaginatedResult<T> {
  data: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export interface DuplicateCandidate {
  bettingAgentId: string
  code: string
  displayName: string | null
}

export interface CompensationPolicyInput {
  type: CompensationPolicyType
  percentage?: number
  weeklyFixedAmountCents?: number
}

export interface PartyContactInput {
  phone: string
  label?: string
}

export interface BettingAgentAddressInput {
  street?: string
  number?: string
  neighborhood: string
  city: string
}

export interface CreateBettingAgentInput {
  code: string
  policy: CompensationPolicyInput
  name?: string
  nickname?: string
  phones?: PartyContactInput[]
  address?: BettingAgentAddressInput
  confirmPossibleDuplicate?: boolean
}

export interface UpdateBettingAgentInput {
  name?: string
  nickname?: string
  phones?: PartyContactInput[]
  address?: BettingAgentAddressInput | null
}

export type ListResult =
  | { status: 'success'; data: PaginatedResult<BettingAgentListItem> }
  | { status: 'forbidden' }
  | { status: 'error' }

export type DetailResult =
  | { status: 'success'; data: BettingAgentDetail }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'error' }

/**
 * Resultado discriminado de criação: sucesso, conflito de código, alerta de
 * possível duplicidade (confirmável, com candidatos) e negações. O código de
 * domínio vem no `code` da resposta (ou no primeiro item de `message`).
 */
export type CreateResult =
  | { status: 'created'; bettingAgentId: string; code: string }
  | { status: 'code_conflict' }
  | { status: 'possible_duplicate'; candidates: DuplicateCandidate[] }
  | { status: 'forbidden' }
  | { status: 'invalid' }
  | { status: 'error' }

interface ErrorBody {
  code?: string
  message?: string[]
  details?: DuplicateCandidate[]
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function errorCode(body: ErrorBody | null): string | undefined {
  return body?.code ?? body?.message?.[0]
}

export interface ListParams {
  search?: string
  page?: number
  pageSize?: number
}

export async function list(params: ListParams = {}): Promise<ListResult> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  const suffix = query.toString() ? `?${query.toString()}` : ''

  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}${suffix}`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<PaginatedResult<BettingAgentListItem>>(res)
  if (!body || !Array.isArray(body.data)) return { status: 'error' }
  return { status: 'success', data: body }
}

export async function getById(id: string): Promise<DetailResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<BettingAgentDetail>(res)
  if (!body || typeof body.id !== 'string') return { status: 'error' }
  return { status: 'success', data: body }
}

export async function create(input: CreateBettingAgentInput): Promise<CreateResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }

  if (res.ok) {
    const body = await safeJson<{ bettingAgentId: string; code: string }>(res)
    if (!body) return { status: 'error' }
    return { status: 'created', bettingAgentId: body.bettingAgentId, code: body.code }
  }

  const body = await safeJson<ErrorBody>(res)
  const code = errorCode(body)

  if (res.status === 403) return { status: 'forbidden' }
  if (code === 'PARTICIPANTS.POSSIBLE_DUPLICATE') {
    return { status: 'possible_duplicate', candidates: body?.details ?? [] }
  }
  if (code === 'PARTICIPANTS.CODE_ALREADY_EXISTS') return { status: 'code_conflict' }
  if (res.status === 400 || res.status === 409) return { status: 'invalid' }
  return { status: 'error' }
}

export type UpdateResult =
  | { status: 'success'; data: { bettingAgentId: string; partyId: string } }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'invalid' }
  | { status: 'error' }

export async function update(id: string, input: UpdateBettingAgentInput): Promise<UpdateResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { status: 'error' }
  }

  if (res.ok) {
    const body = await safeJson<{ bettingAgentId: string; partyId: string }>(res)
    if (!body) return { status: 'error' }
    return { status: 'success', data: body }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  if (res.status === 400 || res.status === 409) return { status: 'invalid' }
  return { status: 'error' }
}

export type SetStatusResult =
  | { status: 'success'; data: { bettingAgentId: string; status: BettingAgentStatus } }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'error' }

export async function setStatus(id: string, status: BettingAgentStatus): Promise<SetStatusResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(`${BASE}/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  } catch {
    return { status: 'error' }
  }

  if (res.ok) {
    const body = await safeJson<{ bettingAgentId: string; status: BettingAgentStatus }>(res)
    if (!body) return { status: 'error' }
    return { status: 'success', data: body }
  }
  if (res.status === 403) return { status: 'forbidden' }
  if (res.status === 404) return { status: 'not_found' }
  return { status: 'error' }
}
