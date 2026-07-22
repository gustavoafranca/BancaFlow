import { v, type VOResult } from '@/shared/form/validator'
import type { CompensationPolicyType } from './betting-agent.client'

// Value Objects locais (client-safe) para o formulário de cadastro de Cambista,
// espelhando as regras de `@bancaflow/participants` (código somente-dígitos,
// política discriminada, percentual/valor fixo). Só feedback de UX imediato — a
// validação AUTORITATIVA é do Backend.

const DIGITS_ONLY = /^\d+$/

/** Código/talão: somente dígitos, trim externo, zeros à esquerda preservados. */
export const CodeField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (!raw || !DIGITS_ONLY.test(raw)) {
      return { isFailure: true, isOk: false, errors: ['CODE_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

const POLICY_TYPES: CompensationPolicyType[] = [
  'PERCENTAGE_ON_SALES',
  'FIXED_WEEKLY',
  'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
]

export const PolicyTypeField = {
  tryCreate(value: CompensationPolicyType): VOResult<CompensationPolicyType> {
    if (!POLICY_TYPES.includes(value)) {
      return { isFailure: true, isOk: false, errors: ['POLICY_TYPE_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value } }
  },
}

/**
 * Percentual em pontos percentuais `(0, 100]`. O valor é mantido como string
 * (mesmo modelo dos demais campos do app); a conversão para número acontece no
 * submit. Valida o intervalo aqui apenas como feedback de UX.
 */
export const PercentageField = {
  tryCreate(value: string): VOResult<string> {
    const raw = String(value).trim()
    const parsed = Number(raw.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      return { isFailure: true, isOk: false, errors: ['PERCENTAGE_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

/** Valor fixo semanal em reais (positivo). Convertido para centavos no submit. */
export const WeeklyAmountField = {
  tryCreate(value: string): VOResult<string> {
    const raw = String(value).trim()
    const parsed = Number(raw.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { isFailure: true, isOk: false, errors: ['AMOUNT_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

export const FreeTextField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim() : ''
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

const PHONE_DIGITS = /^\d{10,11}$/

/** Espelha `Phone` do domínio (10 dígitos fixo / 11 celular, com DDD). Feedback de UX; validação autoritativa é do Backend. */
export const PhoneField = {
  tryCreate(value: string): VOResult<string> {
    const digits = (typeof value === 'string' ? value : '').replace(/\D/g, '')
    if (!PHONE_DIGITS.test(digits)) {
      return { isFailure: true, isOk: false, errors: ['PHONE_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: digits } }
  },
}

const requiresPercentage = (type: CompensationPolicyType) =>
  type === 'PERCENTAGE_ON_SALES' || type === 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'

const requiresWeeklyAmount = (type: CompensationPolicyType) =>
  type === 'FIXED_WEEKLY' || type === 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES'

export const createBettingAgentSchema = v
  .defineObject({
    code: CodeField,
    policyType: PolicyTypeField,
    percentage: { vo: PercentageField, optional: true },
    weeklyFixedAmount: { vo: WeeklyAmountField, optional: true },
    name: { vo: FreeTextField, optional: true },
    nickname: { vo: FreeTextField, optional: true },
    neighborhood: { vo: FreeTextField, optional: true },
    city: { vo: FreeTextField, optional: true },
    street: { vo: FreeTextField, optional: true },
    number: { vo: FreeTextField, optional: true },
  })
  .refine((data) => !requiresPercentage(data.policyType) || data.percentage !== undefined, {
    message: 'Informe o percentual para este tipo de política.',
    field: 'percentage',
  })
  .refine((data) => !requiresWeeklyAmount(data.policyType) || data.weeklyFixedAmount !== undefined, {
    message: 'Informe o valor fixo semanal para este tipo de política.',
    field: 'weeklyFixedAmount',
  })
  .refine((data) => !data.city || !!data.neighborhood, {
    message: 'Bairro é obrigatório quando há endereço.',
    field: 'neighborhood',
  })
  .refine((data) => !data.neighborhood || !!data.city, {
    message: 'Cidade é obrigatória quando há endereço.',
    field: 'city',
  })

export type CreateBettingAgentFormData = v.infer<typeof createBettingAgentSchema>

/**
 * Schema de edição da política (`PATCH /:id/policy`, `enable-betting-agent-
 * policy-update`), separado do schema de perfil abaixo — endpoint/contrato
 * dedicado (D2), reaproveita os mesmos VOs/`.refine()` de `createBettingAgentSchema`.
 */
export const updateBettingAgentPolicySchema = v
  .defineObject({
    policyType: PolicyTypeField,
    percentage: { vo: PercentageField, optional: true },
    weeklyFixedAmount: { vo: WeeklyAmountField, optional: true },
  })
  .refine((data) => !requiresPercentage(data.policyType) || data.percentage !== undefined, {
    message: 'Informe o percentual para este tipo de política.',
    field: 'percentage',
  })
  .refine((data) => !requiresWeeklyAmount(data.policyType) || data.weeklyFixedAmount !== undefined, {
    message: 'Informe o valor fixo semanal para este tipo de política.',
    field: 'weeklyFixedAmount',
  })

export type UpdateBettingAgentPolicyFormData = v.infer<typeof updateBettingAgentPolicySchema>

/**
 * Schema de edição (`PATCH /:id`): sem `code` (somente leitura no modo edit).
 * Política tem contrato/schema próprios (`updateBettingAgentPolicySchema`,
 * D2). `phones` fica fora do schema RHF — o validador `v` local só cobre
 * campos escalares — e é validado item a item via `PhoneField` no drawer,
 * mesmo padrão já usado para a lista de telefones da criação.
 */
export const updateBettingAgentSchema = v
  .defineObject({
    name: { vo: FreeTextField, optional: true },
    nickname: { vo: FreeTextField, optional: true },
    neighborhood: { vo: FreeTextField, optional: true },
    city: { vo: FreeTextField, optional: true },
    street: { vo: FreeTextField, optional: true },
    number: { vo: FreeTextField, optional: true },
  })
  .refine((data) => !data.city || !!data.neighborhood, {
    message: 'Bairro é obrigatório quando há endereço.',
    field: 'neighborhood',
  })
  .refine((data) => !data.neighborhood || !!data.city, {
    message: 'Cidade é obrigatória quando há endereço.',
    field: 'city',
  })

export type UpdateBettingAgentFormData = v.infer<typeof updateBettingAgentSchema>
