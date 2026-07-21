import { v, type VOResult } from '@/shared/form/validator'
import { StrongPasswordField, ConfirmPasswordField } from '@/shared/form/password-fields'

// Schema da troca VOLUNTÁRIA de senha na aba Segurança de `/perfil`.
// Reaproveita os VOs compartilhados de força/confirmação de senha (mesmos de
// `/trocar-senha`, troca obrigatória) sem duplicá-los — apenas `currentPassword`
// é específico deste fluxo. A validação de "senha atual correta" é sempre
// autoritativa do Backend; aqui só se exige não-vazio.
export const CurrentPasswordField = {
  tryCreate(value: string): VOResult<string> {
    if (typeof value !== 'string' || value.length === 0) {
      return { isFailure: true, isOk: false, errors: ['CURRENT_PASSWORD_REQUIRED'] }
    }
    return { isFailure: false, isOk: true, instance: { value } }
  },
}

export const securityPasswordSchema = v
  .defineObject({
    currentPassword: CurrentPasswordField,
    newPassword: StrongPasswordField,
    confirmPassword: ConfirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    field: 'confirmPassword',
  })

export type SecurityPasswordFormData = v.infer<typeof securityPasswordSchema>
