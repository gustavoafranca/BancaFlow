import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { securityPasswordSchema } from './security-password.schema'
import { v } from '@/shared/form/validator'

const resolver = v.resolver(securityPasswordSchema)

describe('securityPasswordSchema', () => {
  it('rejeita senha atual vazia', async () => {
    const { errors } = await resolver(
      { currentPassword: '', newPassword: 'NovaSenhaForte@123', confirmPassword: 'NovaSenhaForte@123' },
      {},
      { shouldUseNativeValidation: false, fields: {} },
    )
    expect(errors.currentPassword).toBeDefined()
  })

  it('rejeita nova senha fraca', async () => {
    const { errors } = await resolver(
      { currentPassword: 'old', newPassword: 'fraca', confirmPassword: 'fraca' },
      {},
      { shouldUseNativeValidation: false, fields: {} },
    )
    expect(errors.newPassword).toBeDefined()
  })

  it('rejeita confirmação divergente', async () => {
    const { errors } = await resolver(
      {
        currentPassword: 'old',
        newPassword: 'NovaSenhaForte@123',
        confirmPassword: 'Diferente@123',
      },
      {},
      { shouldUseNativeValidation: false, fields: {} },
    )
    expect(errors.confirmPassword).toBeDefined()
  })

  it('aceita combinação válida', async () => {
    const result = await resolver(
      {
        currentPassword: 'old',
        newPassword: 'NovaSenhaForte@123',
        confirmPassword: 'NovaSenhaForte@123',
      },
      {},
      { shouldUseNativeValidation: false, fields: {} },
    )
    expect(result.errors).toEqual({})
    expect(result.values).toEqual({
      currentPassword: 'old',
      newPassword: 'NovaSenhaForte@123',
      confirmPassword: 'NovaSenhaForte@123',
    })
  })
})

describe('ownership: modules/perfil não importa de app/trocar-senha', () => {
  it('nenhum arquivo de modules/perfil importa de app/trocar-senha', () => {
    const perfilDir = join(__dirname, '..')
    const offenders: string[] = []

    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath)
          continue
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue
        const content = readFileSync(fullPath, 'utf8')
        if (/from ['"].*trocar-senha/.test(content)) {
          offenders.push(fullPath)
        }
      }
    }

    walk(perfilDir)
    expect(offenders).toEqual([])
  })
})
