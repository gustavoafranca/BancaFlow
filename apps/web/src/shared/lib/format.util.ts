// Helpers de formatação compartilhados (tarefa 4.4) — consolida `fmt`/`initials`
// duplicados entre `lancamentos/_components/data.ts` e `acerto/_components/shared.tsx`.
//
// Os dois arquivos tinham políticas de sinal DIFERENTES sob o mesmo nome `fmt`
// (lancamentos exibe o sinal nativo do `toLocaleString`; acerto sempre mostra
// magnitude absoluta, com um `fmtSaldo` separado para o prefixo +/-) — por isso
// aqui são três funções distintas e nomeadas pelo comportamento, não uma
// unificação forçada que mudaria a saída visual de um dos dois consumidores.

/** Iniciais (até 2 letras) do nome — mesma lógica usada em `lancamentos` e `acerto` (lá como `initialsOf`). */
export function initials(nome: string): string {
  return nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * `R$ <valor>` com o sinal nativo do `toLocaleString` (ex.: `-5` → `R$ -5,00`).
 * Comportamento idêntico ao `fmt` original de `lancamentos/_components/data.ts`.
 */
export function formatCurrency(value: number): string {
  return 'R$ ' + (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * `R$ <magnitude>`, sempre positivo (sem sinal). Comportamento idêntico ao
 * `fmt` original de `acerto/_components/shared.tsx` — usar junto de
 * `formatSignedCurrency` quando o sinal precisa de tratamento visual separado.
 */
export function formatCurrencyAbs(value: number): string {
  return 'R$ ' + (Math.abs(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * `+R$ <magnitude>` / `-R$ <magnitude>`, sinal explícito antes do símbolo.
 * Comportamento idêntico ao `fmtSaldo` original de `acerto/_components/shared.tsx`.
 */
export function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '-'
  return sign + 'R$ ' + (Math.abs(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Converte centavos (inteiro) para string `R$` com 2 casas — idêntico ao `fmtCents` de `lancamentos`. */
export function formatCentsToReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
