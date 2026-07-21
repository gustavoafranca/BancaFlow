import { computeSettlement } from './settlement'

describe('computeSettlement', () => {
  it('tratamento "registrar" preserva a situação escolhida e não abate nada', () => {
    const result = computeSettlement({
      tratamento: 'registrar',
      situacaoSelecionada: 'pendente',
      valorPremio: 100,
      valorAbaterInformado: undefined,
      debitoAtualCambista: 50,
      considerarAcertoSolicitado: false,
    })
    expect(result.situacao).toBe('pendente')
    expect(result.valorAbatido).toBe(0)
    expect(result.saldoGerado).toBe(0)
  })

  it('tratamento "acertar" força situação "pago" e nunca considera no acerto (já liquidado)', () => {
    const result = computeSettlement({
      tratamento: 'acertar',
      situacaoSelecionada: 'pendente',
      valorPremio: 100,
      valorAbaterInformado: undefined,
      debitoAtualCambista: 0,
      considerarAcertoSolicitado: true,
    })
    expect(result.situacao).toBe('pago')
    expect(result.considerarAcerto).toBe(false)
  })

  it('tratamento "abater" usa o default min(valor do prêmio, débito) quando nada é informado', () => {
    const result = computeSettlement({
      tratamento: 'abater',
      situacaoSelecionada: 'pendente',
      valorPremio: 100,
      valorAbaterInformado: undefined,
      debitoAtualCambista: 60,
      considerarAcertoSolicitado: false,
    })
    expect(result.situacao).toBe('pago')
    expect(result.valorAbaterEfetivo).toBe(60)
    expect(result.valorAbatido).toBe(60)
    expect(result.debitoRestante).toBe(0)
    expect(result.saldoGerado).toBe(0)
  })

  it('tratamento "abater" com valor abatido MAIOR que o débito gera crédito (saldoGerado > 0)', () => {
    const result = computeSettlement({
      tratamento: 'abater',
      situacaoSelecionada: 'pendente',
      valorPremio: 100,
      valorAbaterInformado: 80,
      debitoAtualCambista: 50,
      considerarAcertoSolicitado: false,
    })
    expect(result.debitoRestante).toBe(-30)
    expect(result.saldoGerado).toBe(30)
    expect(result.valorAbatido).toBe(80)
  })

  it('tratamento "abater" com débito zero e nenhum valor informado não abate nada', () => {
    const result = computeSettlement({
      tratamento: 'abater',
      situacaoSelecionada: 'pendente',
      valorPremio: 100,
      valorAbaterInformado: undefined,
      debitoAtualCambista: 0,
      considerarAcertoSolicitado: false,
    })
    expect(result.valorAbaterEfetivo).toBe(0)
    expect(result.valorAbatido).toBe(0)
  })

  it('valor informado manualmente sobrepõe o default de abatimento', () => {
    const result = computeSettlement({
      tratamento: 'abater',
      situacaoSelecionada: 'pendente',
      valorPremio: 100,
      valorAbaterInformado: 10,
      debitoAtualCambista: 60,
      considerarAcertoSolicitado: false,
    })
    expect(result.valorAbaterEfetivo).toBe(10)
    expect(result.debitoRestante).toBe(50)
  })
})
