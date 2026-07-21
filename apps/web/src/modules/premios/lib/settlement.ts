import type { Situacao, Tratamento } from '../types'

export interface SettlementInput {
  tratamento: Tratamento
  /** Situação escolhida no formulário — só usada quando `tratamento` não força uma situação (ver abaixo). */
  situacaoSelecionada: Situacao
  valorPremio: number
  /** Valor digitado manualmente para abater; `undefined`/vazio usa o default (min(valorPremio, débito)). */
  valorAbaterInformado: number | undefined
  debitoAtualCambista: number
  /** Se o usuário marcou "considerar no acerto" (só aplicável quando a situação permite). */
  considerarAcertoSolicitado: boolean
}

export interface SettlementResult {
  situacao: Situacao
  valorAbatido: number
  saldoGerado: number
  considerarAcerto: boolean
  /** Valor efetivamente abatido (após aplicar o default), exposto para exibição no formulário. */
  valorAbaterEfetivo: number
  /** Débito restante do cambista após o abatimento (negativo = crédito gerado). */
  debitoRestante: number
}

/**
 * Calcula o resultado financeiro de registrar um prêmio/reclamação: qual
 * situação/tratamento resultam, quanto é abatido do débito do cambista e
 * quanto crédito é gerado.
 *
 * ⚠️ LIMITAÇÃO DE ESCOPO CONHECIDA (`web-frontend-boundaries`: "Domain money/
 * settlement rules are not owned by a page"): esta função é a ÚNICA fonte da
 * regra hoje — não existe endpoint de backend para prêmios/débitos/acerto
 * nesta change (`DEBITOS`/`BASE_PREMIOS` são dados de amostra em memória, sem
 * persistência real). Isolar e testar esta regra (antes inline em `savePremio`
 * dentro de `page.tsx`) é o que esta tarefa consegue entregar com segurança;
 * tornar este cálculo autoritativo de fato exige uma capability de backend
 * nova (registro de prêmios + acerto), fora do escopo desta revisão de
 * arquitetura do frontend — não deve ser inventada silenciosamente aqui.
 */
export function computeSettlement(input: SettlementInput): SettlementResult {
  const { tratamento, situacaoSelecionada, valorPremio, valorAbaterInformado, debitoAtualCambista, considerarAcertoSolicitado } = input

  const valorAbaterEfetivo =
    valorAbaterInformado !== undefined ? valorAbaterInformado : Math.min(valorPremio, Math.max(0, debitoAtualCambista))
  const debitoRestante = debitoAtualCambista - valorAbaterEfetivo

  // "Acertar" e "abater" liquidam o prêmio imediatamente (situação = pago),
  // independentemente da situação escolhida manualmente no formulário.
  const situacao: Situacao = tratamento === 'acertar' || tratamento === 'abater' ? 'pago' : situacaoSelecionada

  const valorAbatido = tratamento === 'abater' ? valorAbaterEfetivo : 0
  const saldoGerado = tratamento === 'abater' ? Math.max(0, -debitoRestante) : 0

  // "Acertar" já liquida na hora (não entra de novo no cálculo do acerto);
  // para os demais tratamentos, respeita o toggle solicitado pelo usuário.
  const considerarAcerto = tratamento === 'acertar' ? false : considerarAcertoSolicitado

  return { situacao, valorAbatido, saldoGerado, considerarAcerto, valorAbaterEfetivo, debitoRestante }
}
