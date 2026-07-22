// Helpers de formatação compartilhados (tarefa 4.4) — consolida `fmt`/`initials`
// duplicados entre `lancamentos/_components/data.ts` e `acerto/_components/shared.tsx`.
//
// Os dois arquivos tinham políticas de sinal DIFERENTES sob o mesmo nome `fmt`
// (lancamentos exibe o sinal nativo do `toLocaleString`; acerto sempre mostra
// magnitude absoluta, com um `fmtSaldo` separado para o prefixo +/-) — por isso
// aqui são três funções distintas e nomeadas pelo comportamento, não uma
// unificação forçada que mudaria a saída visual de um dos dois consumidores.

/**
 * Iniciais do nome: primeiro nome + último nome (sobrenome) — nomes do meio
 * são ignorados (ex.: "Gustavo de Avelar França" → "GF", não "GD"). Nome com
 * uma palavra só usa a própria inicial.
 */
export function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Classes Tailwind (`bg-gradient-to-br from-[..] to-[..]`) para o avatar
 * circular de listagem/drawer, escolhidas deterministicamente por hash do
 * `seed` (ex.: id do registro) — mesma paleta usada pelos avatares por tipo
 * de `pessoas.sample.ts` (`AVATAR_BY_TIPO`), estendida para entidades sem
 * uma dimensão de agrupamento natural (ex.: Cambista).
 */
const AVATAR_GRADIENT_CLASSES = [
  'bg-gradient-to-br from-[#005533] to-[#00C773]',
  'bg-gradient-to-br from-[#1a3a6a] to-[#4a7ac4]',
  'bg-gradient-to-br from-[#5a3a00] to-[#c47a10]',
  'bg-gradient-to-br from-[#003366] to-[#0066CC]',
  'bg-gradient-to-br from-[#4a1a5a] to-[#a44ac4]',
  'bg-gradient-to-br from-[#5a0a1a] to-[#c43a5a]',
] as const

export function avatarGradientClass(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_GRADIENT_CLASSES[Math.abs(hash) % AVATAR_GRADIENT_CLASSES.length]
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
