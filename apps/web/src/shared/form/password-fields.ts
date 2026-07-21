import type { VOResult } from './validator'

// VOs client-safe de senha, compartilhados entre `/trocar-senha` (troca
// obrigatória) e o formulário de troca voluntária em `modules/perfil`
// (mesmas regras do `StrongPassword` de `@bancaflow/shared`, replicadas aqui
// para não arrastar dependências server-only do pacote para o bundle do
// client). Extraído de `app/trocar-senha/change-password.schema.ts` para
// evitar cópias divergentes da mesma regra entre as duas telas — nenhum dos
// dois módulos importa do outro.
function isStrong(value: string): boolean {
  if (value.length < 8) return false
  if (!/[A-Z]/.test(value)) return false
  if (!/[a-z]/.test(value)) return false
  if (!/[0-9]/.test(value)) return false
  if (!/[^A-Za-z0-9]/.test(value)) return false
  return true
}

export const StrongPasswordField = {
  tryCreate(value: string): VOResult<string> {
    if (typeof value !== 'string' || !isStrong(value)) {
      return { isFailure: true, isOk: false, errors: ['WEAK_PASSWORD'] }
    }
    return { isFailure: false, isOk: true, instance: { value } }
  },
}

export const ConfirmPasswordField = {
  tryCreate(value: string): VOResult<string> {
    if (typeof value !== 'string' || value.length === 0) {
      return { isFailure: true, isOk: false, errors: ['PASSWORD_REQUIRED'] }
    }
    return { isFailure: false, isOk: true, instance: { value } }
  },
}
