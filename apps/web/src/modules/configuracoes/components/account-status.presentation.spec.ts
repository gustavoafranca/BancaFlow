import { actionForTargetStatus, STATUS_SELECTION_OPTIONS } from './account-status.presentation'

describe('STATUS_SELECTION_OPTIONS', () => {
  it('lista os 3 estados reais do backend, na ordem Ativo/Inativo/Bloqueado', () => {
    expect(STATUS_SELECTION_OPTIONS.map((o) => o.value)).toEqual(['ACTIVE', 'INACTIVE', 'BLOCKED'])
    expect(STATUS_SELECTION_OPTIONS.map((o) => o.label)).toEqual(['Ativo', 'Inativo', 'Bloqueado'])
  })
})

describe('actionForTargetStatus', () => {
  it('retorna null quando o alvo já é o status atual (seleção redundante)', () => {
    expect(actionForTargetStatus('ACTIVE', 'ACTIVE')).toBeNull()
    expect(actionForTargetStatus('BLOCKED', 'BLOCKED')).toBeNull()
  })

  it('Inativo → Ativo usa "activate"', () => {
    expect(actionForTargetStatus('INACTIVE', 'ACTIVE')).toBe('activate')
  })

  it('Bloqueado → Ativo usa "unblock" (mesmo efeito de domínio, rótulo mais claro)', () => {
    expect(actionForTargetStatus('BLOCKED', 'ACTIVE')).toBe('unblock')
  })

  it('qualquer origem → Inativo usa "deactivate"', () => {
    expect(actionForTargetStatus('ACTIVE', 'INACTIVE')).toBe('deactivate')
    expect(actionForTargetStatus('BLOCKED', 'INACTIVE')).toBe('deactivate')
  })

  it('qualquer origem → Bloqueado usa "block"', () => {
    expect(actionForTargetStatus('ACTIVE', 'BLOCKED')).toBe('block')
    expect(actionForTargetStatus('INACTIVE', 'BLOCKED')).toBe('block')
  })
})
