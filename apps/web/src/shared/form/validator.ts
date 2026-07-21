import type { Resolver, FieldErrors } from 'react-hook-form'

type FieldErrorEntry = { type: string; message: string }

// Validador tipado `v` no padrão do projeto (React Hook Form + schema por
// Value Objects). O pacote `@bancaflow/shared` NÃO expõe um export `v`
// utilizável no client (a implementação de referência vive apenas nos assets
// da skill `config-shared-frontend`, acoplada a i18n e componentes de form que
// não existem neste app). Por isso mantemos aqui uma versão enxuta e
// autocontida, com a MESMA API pública documentada: `v.defineObject`,
// `v.resolver` e `v.infer`. Nenhum Zod é introduzido.

export type VOResult<T> = {
  isFailure: boolean
  isOk: boolean
  errors?: string[]
  instance?: { value: T }
}

export type ValueObjectClass<T, Config = unknown> = {
  tryCreate(value: T, config?: Config): VOResult<T>
}

export type FieldConfig<T, Config = unknown> = {
  vo: ValueObjectClass<T, Config>
  optional?: boolean
  config?: Config
}

export type SchemaField<T = unknown> = ValueObjectClass<T> | FieldConfig<T>

export type Schema = Record<string, SchemaField>

type ExtractValue<F> =
  F extends FieldConfig<infer V>
    ? F extends { optional: true }
      ? V | undefined
      : V
    : F extends ValueObjectClass<infer V2>
      ? V2
      : never

export type Infer<T extends Schema> = {
  [K in keyof T]: ExtractValue<T[K]>
}

export type Refinement<T> = {
  check: (data: T) => boolean
  message: string
  field: keyof T & string
}

export interface SchemaObject<T extends Schema = Schema> {
  fields: T
  _refinements: Refinement<Infer<T>>[]
  refine: (
    check: (data: Infer<T>) => boolean,
    config: { message: string; field: keyof T & string },
  ) => SchemaObject<T>
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

function isVOClass(field: SchemaField): field is ValueObjectClass<unknown> {
  return typeof (field as ValueObjectClass<unknown>).tryCreate === 'function'
}

function resolveField(field: SchemaField): {
  vo: ValueObjectClass<unknown>
  optional: boolean
  config?: unknown
} {
  if (isVOClass(field)) return { vo: field, optional: false }
  return { vo: field.vo, optional: field.optional === true, config: field.config }
}

class Validator {
  defineObject<T extends Schema>(fields: T): SchemaObject<T> {
    const refinements: Refinement<Infer<T>>[] = []
    const obj: SchemaObject<T> = {
      fields,
      _refinements: refinements,
      refine: (check, config) => {
        refinements.push({ check, message: config.message, field: config.field })
        return obj
      },
    }
    return obj
  }

  resolver<T extends Schema>(schema: SchemaObject<T> | T): Resolver<Infer<T>> {
    return async (values) => {
      const isObj =
        typeof schema === 'object' && 'fields' in schema && '_refinements' in schema
      const fields = (isObj ? (schema as SchemaObject<T>).fields : schema) as T
      const refinements: Refinement<Infer<T>>[] = isObj
        ? (schema as SchemaObject<T>)._refinements
        : []
      const errors: Record<string, FieldErrorEntry> = {}
      const processed: Record<string, unknown> = {}

      for (const key of Object.keys(fields) as Array<keyof T & string>) {
        const field = fields[key]
        const raw = (values as Record<string, unknown>)[key]
        const { vo, optional, config } = resolveField(field)

        if (isEmpty(raw)) {
          if (!optional) {
            errors[key] = { type: 'required', message: 'Campo obrigatório.' }
          } else {
            processed[key] = undefined
          }
          continue
        }

        const result = vo.tryCreate(raw, config)
        if (result.isFailure) {
          errors[key] = {
            type: 'validation',
            message: mapVOError(result.errors),
          }
          continue
        }
        processed[key] = result.instance?.value ?? raw
      }

      if (Object.keys(errors).length === 0 && refinements.length > 0) {
        const data = processed as Infer<T>
        for (const r of refinements) {
          if (!r.check(data)) {
            errors[r.field] = { type: 'refinement', message: r.message }
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        return {
          values: {},
          errors: errors as FieldErrors<Infer<T>>,
        }
      }
      return { values: processed as Infer<T>, errors: {} }
    }
  }
}

function mapVOError(errors?: string[]): string {
  const code = errors?.[0]
  return code ? (VO_ERROR_MESSAGES[code] ?? 'Valor inválido.') : 'Valor inválido.'
}

const VO_ERROR_MESSAGES: Record<string, string> = {
  USERNAME_TOO_SHORT: 'Informe um usuário válido.',
  USERNAME_INVALID: 'Usuário inválido.',
  PASSWORD_REQUIRED: 'Informe a senha.',
  WEAK_PASSWORD:
    'A senha deve ter ao menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
  PASSWORDS_DO_NOT_MATCH: 'As senhas não coincidem.',
}

export const v = new Validator()

// Namespace para `v.infer<typeof schema>` (mesmo padrão da implementação de
// referência do projeto).
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace v {
  export type infer<T> =
    T extends { fields: infer S extends Schema }
      ? Infer<S>
      : T extends Schema
        ? Infer<T>
        : never
}
