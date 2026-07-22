'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { v } from '@/shared/form/validator'
import { Drawer, DrawerContent, DrawerBody, DrawerFooter } from '@/shared/components/ui/drawer'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { FormField } from '@/shared/components/ui/form-field'
import { ReadOnlyField } from '@/shared/components/ui/read-only-field'
import { PhoneInput, formatBrazilianPhone } from '@/shared/components/ui/phone-input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { SelectionButtonGroup } from '@/shared/components/ui/selection-button-group'
import { useHasPermission } from '@/shared/session/use-permissions'
import { formatCentsToReais } from '@/shared/lib/format.util'
import {
  create,
  update,
  setStatus,
  updatePolicy,
  type CompensationPolicyInput,
  type CompensationPolicyType,
  type BettingAgentDetail,
  type BettingAgentStatus,
  type CreateBettingAgentInput,
  type UpdateBettingAgentInput,
  type DuplicateCandidate,
  type PartyContactInput,
} from '../data/betting-agent.client'
import {
  createBettingAgentSchema,
  updateBettingAgentSchema,
  updateBettingAgentPolicySchema,
  PhoneField,
  type CreateBettingAgentFormData,
  type UpdateBettingAgentFormData,
  type UpdateBettingAgentPolicyFormData,
} from '../data/betting-agent.schema'

const POLICY_LABELS: Record<CompensationPolicyType, string> = {
  PERCENTAGE_ON_SALES: 'Percentual sobre vendas',
  FIXED_WEEKLY: 'Fixo semanal',
  FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES: 'Fixo semanal + percentual',
}

const STATUS_LABEL: Record<BettingAgentStatus, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo' }

const STATUS_SELECTION_OPTIONS = [
  { value: 'ACTIVE' as const, label: 'Ativo', variant: 'success' as const },
  { value: 'INACTIVE' as const, label: 'Inativo', variant: 'danger' as const },
]

type PhoneRow = { phone: string; label: string }

function buildPolicy(
  type: CompensationPolicyType,
  percentageRaw: string | undefined,
  weeklyFixedAmountRaw: string | undefined,
): CompensationPolicyInput {
  const percentage =
    percentageRaw !== undefined ? Number(percentageRaw.replace(',', '.')) : undefined
  const cents =
    weeklyFixedAmountRaw !== undefined
      ? Math.round(Number(weeklyFixedAmountRaw.replace(',', '.')) * 100)
      : undefined
  switch (type) {
    case 'PERCENTAGE_ON_SALES':
      return { type, percentage }
    case 'FIXED_WEEKLY':
      return { type, weeklyFixedAmountCents: cents }
    case 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES':
      return { type, percentage, weeklyFixedAmountCents: cents }
  }
}

function cleanPhoneRows(rows: PhoneRow[]): PartyContactInput[] {
  return rows
    .filter((row) => row.phone.replace(/\D/g, '').length >= 10)
    .map((row) => ({ phone: row.phone, label: row.label.trim() || undefined }))
}

/** `true` quando algum telefone preenchido não passa em `PhoneField` (10/11 dígitos). */
function hasInvalidPhone(rows: PhoneRow[]): boolean {
  return rows.some((row) => row.phone.length > 0 && PhoneField.tryCreate(row.phone).isFailure)
}

type BettingAgentDrawerProps =
  | {
      mode: 'create'
      open: boolean
      onOpenChange: (open: boolean) => void
      onCreated: () => void
    }
  | {
      mode: 'detail'
      agent: BettingAgentDetail | null
      open: boolean
      onOpenChange: (open: boolean) => void
      onMutated: () => void
    }

/**
 * Drawer único de Cambista (`enable-betting-agent-management`), substituindo
 * os dois drawers anteriores (criação + detalhe somente-leitura). Três abas
 * (Cadastro/Endereço/Contato) compartilhadas pelos modos `create`/`view`/
 * `edit`; a aba Cadastro difere por modo — código e política são
 * obrigatórios/editáveis só na criação, somente leitura depois (`code`/
 * política são imutáveis por `PATCH`, D4/D-code-immutable).
 */
export function BettingAgentDrawer(props: BettingAgentDrawerProps) {
  if (props.mode === 'create') {
    return (
      <CreateForm open={props.open} onOpenChange={props.onOpenChange} onCreated={props.onCreated} />
    )
  }
  return (
    <AgentDetail
      agent={props.agent}
      open={props.open}
      onOpenChange={props.onOpenChange}
      onMutated={props.onMutated}
    />
  )
}

type CreateSubmitStatus = 'forbidden' | 'invalid' | 'error' | null

const CREATE_BANNER_MESSAGES: Record<Exclude<CreateSubmitStatus, null>, string> = {
  forbidden: 'Você não tem permissão para cadastrar Cambistas.',
  invalid: 'Verifique os dados informados e tente novamente.',
  error: 'Não foi possível cadastrar agora. Tente novamente.',
}

function CreateForm({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBettingAgentFormData>({
    resolver: v.resolver(createBettingAgentSchema),
    defaultValues: { policyType: 'PERCENTAGE_ON_SALES' },
  })

  const [phones, setPhones] = useState<PhoneRow[]>([{ phone: '', label: '' }])
  const [banner, setBanner] = useState<CreateSubmitStatus>(null)
  const [codeConflict, setCodeConflict] = useState(false)
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(null)
  const confirmDuplicateRef = useRef(false)

  const policyType = watch('policyType')
  const showPercentage =
    policyType === 'PERCENTAGE_ON_SALES' || policyType === 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'
  const showWeekly =
    policyType === 'FIXED_WEEKLY' || policyType === 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'

  function resetAll() {
    reset({ policyType: 'PERCENTAGE_ON_SALES' })
    setPhones([{ phone: '', label: '' }])
    setBanner(null)
    setCodeConflict(false)
    setCandidates(null)
    confirmDuplicateRef.current = false
  }

  const submit = handleSubmit(async (data) => {
    setBanner(null)
    setCodeConflict(false)

    if (hasInvalidPhone(phones)) {
      setBanner('invalid')
      return
    }

    const cleanPhones = cleanPhoneRows(phones)
    const hasAddress = Boolean(data.neighborhood && data.city)

    const input: CreateBettingAgentInput = {
      code: data.code,
      policy: buildPolicy(data.policyType, data.percentage, data.weeklyFixedAmount),
      name: data.name || undefined,
      nickname: data.nickname || undefined,
      phones: cleanPhones.length > 0 ? cleanPhones : undefined,
      address: hasAddress
        ? {
            neighborhood: data.neighborhood as string,
            city: data.city as string,
            street: data.street || undefined,
            number: data.number || undefined,
          }
        : undefined,
      confirmPossibleDuplicate: confirmDuplicateRef.current,
    }

    const result = await create(input)
    confirmDuplicateRef.current = false

    switch (result.status) {
      case 'created':
        onCreated()
        resetAll()
        onOpenChange(false)
        break
      case 'possible_duplicate':
        setCandidates(result.candidates)
        break
      case 'code_conflict':
        setCodeConflict(true)
        break
      case 'forbidden':
        setBanner('forbidden')
        break
      case 'invalid':
        setBanner('invalid')
        break
      default:
        setBanner('error')
    }
  })

  function confirmAndResubmit() {
    confirmDuplicateRef.current = true
    setCandidates(null)
    void submit()
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAll()
        onOpenChange(next)
      }}
    >
      <DrawerContent
        title="Novo Cambista"
        description="Código e política são obrigatórios. Nome, apelido, telefones e endereço são opcionais."
      >
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <Tabs defaultValue="cadastro" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="mx-5 mt-3">
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="contato">Contato</TabsTrigger>
            </TabsList>

            <DrawerBody className="flex flex-col gap-4 p-5 pt-4">
              <TabsContent value="cadastro" className="mt-0 flex flex-col gap-4">
                <FormField label="Código / Talão" htmlFor="ba-code" error={errors.code?.message}>
                  <Input id="ba-code" inputMode="numeric" autoComplete="off" {...register('code')} />
                  {codeConflict && (
                    <p role="alert" className="mt-1 text-[11.5px] text-destructive">
                      Este código já está em uso nesta Banca. Escolha outro.
                    </p>
                  )}
                </FormField>

                <FormField label="Tipo de política" htmlFor="ba-policy">
                  <Select
                    value={policyType}
                    onValueChange={(next) => setValue('policyType', next as CompensationPolicyType)}
                  >
                    <SelectTrigger id="ba-policy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(POLICY_LABELS) as CompensationPolicyType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {POLICY_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {showPercentage && (
                  <FormField label="Percentual (%)" htmlFor="ba-pct" error={errors.percentage?.message}>
                    <Input id="ba-pct" inputMode="decimal" autoComplete="off" {...register('percentage')} />
                  </FormField>
                )}

                {showWeekly && (
                  <FormField
                    label="Valor fixo semanal (R$)"
                    htmlFor="ba-weekly"
                    error={errors.weeklyFixedAmount?.message}
                  >
                    <Input
                      id="ba-weekly"
                      inputMode="decimal"
                      autoComplete="off"
                      {...register('weeklyFixedAmount')}
                    />
                  </FormField>
                )}

                <FormField label="Nome (opcional)" htmlFor="ba-name" error={errors.name?.message}>
                  <Input id="ba-name" autoComplete="off" {...register('name')} />
                </FormField>

                <FormField label="Apelido (opcional)" htmlFor="ba-nick" error={errors.nickname?.message}>
                  <Input id="ba-nick" autoComplete="off" {...register('nickname')} />
                </FormField>
              </TabsContent>

              <TabsContent value="endereco" className="mt-0 flex flex-col gap-4">
                <FormField label="Rua (opcional)" htmlFor="ba-street" error={errors.street?.message}>
                  <Input id="ba-street" autoComplete="off" {...register('street')} />
                </FormField>
                <FormField label="Número (opcional)" htmlFor="ba-number" error={errors.number?.message}>
                  <Input id="ba-number" autoComplete="off" {...register('number')} />
                </FormField>
                <FormField
                  label="Bairro (obrigatório com endereço)"
                  htmlFor="ba-hood"
                  error={errors.neighborhood?.message}
                >
                  <Input id="ba-hood" autoComplete="off" {...register('neighborhood')} />
                </FormField>
                <FormField
                  label="Cidade (obrigatória com endereço)"
                  htmlFor="ba-city"
                  error={errors.city?.message}
                >
                  <Input id="ba-city" autoComplete="off" {...register('city')} />
                </FormField>
              </TabsContent>

              <TabsContent value="contato" className="mt-0">
                <PhoneListEditor phones={phones} onChange={setPhones} />
              </TabsContent>

              {candidates && candidates.length > 0 && (
                <DuplicateAlert candidates={candidates} onConfirm={confirmAndResubmit} disabled={isSubmitting} />
              )}

              {banner && <ErrorBanner>{CREATE_BANNER_MESSAGES[banner]}</ErrorBanner>}
            </DrawerBody>
          </Tabs>
        </form>

        <DrawerFooter
          mode="create"
          saveLabel="Cadastrar"
          onClose={() => onOpenChange(false)}
          onSave={() => void submit()}
          loading={isSubmitting}
        />
      </DrawerContent>
    </Drawer>
  )
}

function PhoneListEditor({
  phones,
  onChange,
}: {
  phones: PhoneRow[]
  onChange: (phones: PhoneRow[]) => void
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Telefones (opcional)
      </span>
      <div className="flex flex-col gap-2">
        {phones.map((row, index) => {
          const invalid = row.phone.length > 0 && PhoneField.tryCreate(row.phone).isFailure
          return (
            <div key={index} className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
              <div className="flex gap-2">
                <PhoneInput
                  aria-label={`Telefone ${index + 1}`}
                  aria-invalid={invalid ? 'true' : 'false'}
                  value={row.phone}
                  onChange={(digits) =>
                    onChange(phones.map((p, i) => (i === index ? { ...p, phone: digits } : p)))
                  }
                />
                <Input
                  aria-label={`Rótulo do telefone ${index + 1}`}
                  placeholder="Rótulo (ex.: Celular)"
                  value={row.label}
                  onChange={(e) =>
                    onChange(phones.map((p, i) => (i === index ? { ...p, label: e.target.value } : p)))
                  }
                />
                {phones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onChange(phones.filter((_, i) => i !== index))}
                  >
                    Remover
                  </Button>
                )}
              </div>
              {invalid && (
                <p role="alert" className="text-[11.5px] text-destructive">
                  Telefone inválido. Informe DDD + número (10 ou 11 dígitos).
                </p>
              )}
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-2"
        onClick={() => onChange([...phones, { phone: '', label: '' }])}
      >
        + Adicionar telefone
      </Button>
    </div>
  )
}

function DuplicateAlert({
  candidates,
  onConfirm,
  disabled,
}: {
  candidates: DuplicateCandidate[]
  onConfirm: () => void
  disabled: boolean
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col gap-2 rounded-[10px] border border-[rgba(200,150,0,0.4)] bg-[rgba(200,150,0,0.12)] p-3 text-[12.5px]"
    >
      <strong>Possível duplicidade encontrada</strong>
      <span>Já existem Cambistas parecidos nesta Banca:</span>
      <ul className="m-0 pl-[18px]">
        {candidates.map((cand) => (
          <li key={cand.bettingAgentId}>
            Código {cand.code}
            {cand.displayName ? ` — ${cand.displayName}` : ''}
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" onClick={onConfirm} disabled={disabled}>
        Cadastrar mesmo assim
      </Button>
    </div>
  )
}

type EditSubmitStatus = 'forbidden' | 'not_found' | 'invalid' | 'error' | null

const EDIT_BANNER_MESSAGES: Record<Exclude<EditSubmitStatus, null>, string> = {
  forbidden: 'Você não tem permissão para editar Cambistas.',
  not_found: 'Este Cambista não foi encontrado.',
  invalid: 'Verifique os dados informados e tente novamente.',
  error: 'Não foi possível salvar as alterações agora. Tente novamente.',
}

function phonesFromAgent(agent: BettingAgentDetail): PhoneRow[] {
  return agent.party.contacts.length > 0
    ? agent.party.contacts.map((c) => ({ phone: c.phone, label: c.label ?? '' }))
    : [{ phone: '', label: '' }]
}

function formDefaultsFromAgent(agent: BettingAgentDetail): UpdateBettingAgentFormData {
  return {
    name: agent.party.name ?? undefined,
    nickname: agent.party.nickname ?? undefined,
    street: agent.party.address?.street ?? undefined,
    number: agent.party.address?.number ?? undefined,
    neighborhood: agent.party.address?.neighborhood ?? undefined,
    city: agent.party.address?.city ?? undefined,
  }
}

/** Defaults do form de política (`enable-betting-agent-policy-update`) — contrato/form dedicados (D2/D5). */
function policyFormDefaultsFromAgent(agent: BettingAgentDetail): UpdateBettingAgentPolicyFormData {
  return {
    policyType: agent.policy.type,
    percentage: agent.policy.percentage !== null ? String(agent.policy.percentage) : undefined,
    weeklyFixedAmount:
      agent.policy.weeklyFixedAmountCents !== null
        ? String(agent.policy.weeklyFixedAmountCents / 100)
        : undefined,
  }
}

function AgentDetail({
  agent,
  open,
  onOpenChange,
  onMutated,
}: {
  agent: BettingAgentDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMutated: () => void
}) {
  const canUpdate = useHasPermission('participants.betting-agents.update')
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view')
  const [phones, setPhones] = useState<PhoneRow[]>([])
  const [editSubmitStatus, setEditSubmitStatus] = useState<EditSubmitStatus>(null)
  const [statusError, setStatusError] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateBettingAgentFormData>({ resolver: v.resolver(updateBettingAgentSchema) })

  // Contrato/form de política dedicados (D2/D5) — mesma permissão de
  // `canUpdate` (D1: sem chave dedicada para política).
  const canEditPolicy = canUpdate
  const {
    register: registerPolicy,
    handleSubmit: handleSubmitPolicy,
    watch: watchPolicy,
    setValue: setValuePolicy,
    reset: resetPolicy,
    formState: { errors: policyErrors },
  } = useForm<UpdateBettingAgentPolicyFormData>({ resolver: v.resolver(updateBettingAgentPolicySchema) })
  const editPolicyType = watchPolicy('policyType')
  const showEditPercentage =
    editPolicyType === 'PERCENTAGE_ON_SALES' ||
    editPolicyType === 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'
  const showEditWeekly =
    editPolicyType === 'FIXED_WEEKLY' || editPolicyType === 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'

  const [lastAgentId, setLastAgentId] = useState<string | null>(null)
  if (agent && agent.id !== lastAgentId) {
    setLastAgentId(agent.id)
    setDetailMode('view')
    setEditSubmitStatus(null)
    setStatusError(false)
    setPhones(phonesFromAgent(agent))
  }

  useEffect(() => {
    if (!agent) return
    reset(formDefaultsFromAgent(agent))
    resetPolicy(policyFormDefaultsFromAgent(agent))
  }, [agent, reset, resetPolicy])

  function cancelEdit() {
    if (!agent) return
    setDetailMode('view')
    setEditSubmitStatus(null)
    setPhones(phonesFromAgent(agent))
    reset(formDefaultsFromAgent(agent))
    resetPolicy(policyFormDefaultsFromAgent(agent))
  }

  const submit = handleSubmit(async (data) => {
    if (!agent) return
    setEditSubmitStatus(null)

    if (hasInvalidPhone(phones)) {
      setEditSubmitStatus('invalid')
      return
    }

    if (canEditPolicy) {
      const policyData = await new Promise<UpdateBettingAgentPolicyFormData | null>((resolve) => {
        void handleSubmitPolicy(
          (data) => resolve(data),
          () => resolve(null),
        )()
      })
      if (!policyData) return

      const policyInput = buildPolicy(policyData.policyType, policyData.percentage, policyData.weeklyFixedAmount)
      const policyResult = await updatePolicy(agent.id, { policy: policyInput })
      if (policyResult.status !== 'success') {
        setEditSubmitStatus(policyResult.status)
        return
      }
    }

    const hasAddress = Boolean(data.neighborhood && data.city)
    const input: UpdateBettingAgentInput = {
      name: data.name ?? '',
      nickname: data.nickname ?? '',
      phones: cleanPhoneRows(phones),
      address: hasAddress
        ? {
            neighborhood: data.neighborhood as string,
            city: data.city as string,
            street: data.street || undefined,
            number: data.number || undefined,
          }
        : null,
    }

    const result = await update(agent.id, input)
    if (result.status === 'success') {
      setDetailMode('view')
      onMutated()
      return
    }
    setEditSubmitStatus(result.status)
  })

  async function toggleStatus(next: BettingAgentStatus) {
    if (!agent || next === agent.status) return
    setStatusError(false)
    const result = await setStatus(agent.id, next)
    if (result.status === 'success') {
      onMutated()
    } else {
      setStatusError(true)
    }
  }

  const isViewMode = detailMode === 'view'

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DrawerContent
        title={agent?.party.name ?? agent?.party.nickname ?? `Cambista ${agent?.code ?? ''}`}
        titleBadge={
          agent && (
            <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'danger'} className="shrink-0">
              {STATUS_LABEL[agent.status]}
            </Badge>
          )
        }
        description={agent && `Código ${agent.code}`}
      >
        {agent && (
          <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
            <Tabs defaultValue="cadastro" className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="mx-5 mt-3">
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="contato">Contato</TabsTrigger>
              </TabsList>

              <DrawerBody className="flex flex-col gap-4 p-5 pt-4">
                <TabsContent value="cadastro" className="mt-0 flex flex-col gap-4">
                  {canUpdate && (
                    <section>
                      <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Status
                      </h2>
                      <SelectionButtonGroup
                        aria-label="Status do Cambista"
                        value={agent.status}
                        onValueChange={(next) => void toggleStatus(next as BettingAgentStatus)}
                        options={STATUS_SELECTION_OPTIONS}
                      />
                      {statusError && <ErrorBanner>Não foi possível alterar o status agora.</ErrorBanner>}
                    </section>
                  )}

                  {isViewMode ? (
                    <>
                      <ReadOnlyField label="Código / Talão" value={agent.code} />
                      <ReadOnlyField label="Nome" value={agent.party.name ?? '—'} />
                      <ReadOnlyField label="Apelido" value={agent.party.nickname ?? '—'} />
                      <ReadOnlyField label="Política (não editável)" value={formatPolicyLabel(agent)} />
                    </>
                  ) : (
                    <>
                      <ReadOnlyField label="Código" value={agent.code} />
                      <FormField label="Nome (opcional)" htmlFor="edit-ba-name" error={errors.name?.message}>
                        <Input id="edit-ba-name" autoComplete="off" {...register('name')} />
                      </FormField>
                      <FormField
                        label="Apelido (opcional)"
                        htmlFor="edit-ba-nick"
                        error={errors.nickname?.message}
                      >
                        <Input id="edit-ba-nick" autoComplete="off" {...register('nickname')} />
                      </FormField>
                      {canEditPolicy ? (
                        <>
                          <FormField label="Tipo de política" htmlFor="edit-ba-policy">
                            <Select
                              value={editPolicyType}
                              onValueChange={(next) =>
                                setValuePolicy('policyType', next as CompensationPolicyType)
                              }
                            >
                              <SelectTrigger id="edit-ba-policy">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(POLICY_LABELS) as CompensationPolicyType[]).map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {POLICY_LABELS[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                          {showEditPercentage && (
                            <FormField
                              label="Percentual (%)"
                              htmlFor="edit-ba-pct"
                              error={policyErrors.percentage?.message}
                            >
                              <Input
                                id="edit-ba-pct"
                                inputMode="decimal"
                                autoComplete="off"
                                {...registerPolicy('percentage')}
                              />
                            </FormField>
                          )}
                          {showEditWeekly && (
                            <FormField
                              label="Valor fixo semanal (R$)"
                              htmlFor="edit-ba-weekly"
                              error={policyErrors.weeklyFixedAmount?.message}
                            >
                              <Input
                                id="edit-ba-weekly"
                                inputMode="decimal"
                                autoComplete="off"
                                {...registerPolicy('weeklyFixedAmount')}
                              />
                            </FormField>
                          )}
                        </>
                      ) : (
                        <ReadOnlyField label="Política (não editável)" value={formatPolicyLabel(agent)} />
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="endereco" className="mt-0 flex flex-col gap-4">
                  {isViewMode && !agent.party.address ? (
                    <EmptyState>Nenhum endereço cadastrado.</EmptyState>
                  ) : isViewMode ? (
                    <>
                      <ReadOnlyField label="Rua" value={agent.party.address?.street ?? '—'} />
                      <ReadOnlyField label="Número" value={agent.party.address?.number ?? '—'} />
                      <ReadOnlyField label="Bairro" value={agent.party.address?.neighborhood ?? '—'} />
                      <ReadOnlyField label="Cidade" value={agent.party.address?.city ?? '—'} />
                    </>
                  ) : (
                    <>
                      <FormField label="Rua (opcional)" htmlFor="edit-ba-street" error={errors.street?.message}>
                        <Input id="edit-ba-street" autoComplete="off" {...register('street')} />
                      </FormField>
                      <FormField
                        label="Número (opcional)"
                        htmlFor="edit-ba-number"
                        error={errors.number?.message}
                      >
                        <Input id="edit-ba-number" autoComplete="off" {...register('number')} />
                      </FormField>
                      <FormField
                        label="Bairro (obrigatório com endereço)"
                        htmlFor="edit-ba-hood"
                        error={errors.neighborhood?.message}
                      >
                        <Input id="edit-ba-hood" autoComplete="off" {...register('neighborhood')} />
                      </FormField>
                      <FormField
                        label="Cidade (obrigatória com endereço)"
                        htmlFor="edit-ba-city"
                        error={errors.city?.message}
                      >
                        <Input id="edit-ba-city" autoComplete="off" {...register('city')} />
                      </FormField>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="contato" className="mt-0">
                  {isViewMode ? (
                    agent.party.contacts.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {agent.party.contacts.map((contact, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between rounded-[10px] border border-border bg-secondary/40 p-3"
                          >
                            <span className="text-[13.5px] text-foreground">
                              {formatBrazilianPhone(contact.phone)}
                            </span>
                            {contact.label && (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {contact.label}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState>Nenhum telefone cadastrado.</EmptyState>
                    )
                  ) : (
                    <PhoneListEditor phones={phones} onChange={setPhones} />
                  )}
                </TabsContent>

                {editSubmitStatus && <ErrorBanner>{EDIT_BANNER_MESSAGES[editSubmitStatus]}</ErrorBanner>}
              </DrawerBody>
            </Tabs>
          </form>
        )}

        {isViewMode ? (
          <DrawerFooter
            mode="view"
            onClose={() => onOpenChange(false)}
            onEdit={canUpdate ? () => setDetailMode('edit') : undefined}
          />
        ) : (
          <DrawerFooter
            mode="edit"
            onClose={() => onOpenChange(false)}
            onCancel={cancelEdit}
            onSave={() => void submit()}
            loading={isSubmitting}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

function formatPolicyLabel(agent: BettingAgentDetail): string {
  return `${POLICY_LABELS[agent.policy.type]}${
    agent.policy.percentage !== null ? ` · ${agent.policy.percentage}%` : ''
  }${
    agent.policy.weeklyFixedAmountCents !== null
      ? ` · ${formatCentsToReais(agent.policy.weeklyFixedAmountCents)}`
      : ''
  }`
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] border border-dashed border-border p-3 text-[12.5px] text-muted-foreground">
      {children}
    </p>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-[10px] border border-destructive-border bg-destructive-muted px-3.5 py-2.5 text-[12.5px] font-medium text-destructive"
    >
      {children}
    </div>
  )
}
