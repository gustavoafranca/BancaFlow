/**
 * Códigos de falha TÉCNICA (categoria C do desenho `add-authenticated-user-
 * context-endpoint`): erros de execução — Prisma, conexão, timeout, exceção
 * inesperada — capturados pelos adapters de Query e representados como
 * `Result.fail(<código técnico>)`.
 *
 * Diferem semanticamente de:
 *  - categoria A (rejeições do guard: `INVALID_CREDENTIALS`, `SESSION_REVOKED`,
 *    `ACCOUNT_INACTIVE`, `BANCA_INACTIVE`, `MUST_CHANGE_PASSWORD`); e
 *  - categoria B (inconsistência esperada pós-guard → `INVALID_CREDENTIALS`).
 *
 * A borda HTTP (`IdentityController.unwrap`) os traduz SIMETRICAMENTE para `500`
 * genérico — nunca `400`/`401` — sem vazar o código, a mensagem, a stack ou
 * qualquer detalhe Prisma. A causa raiz já é registrada com contexto interno
 * seguro no adapter (`safeErrorCode`).
 */
export const TECHNICAL_ERROR_CODES = {
  /** Falha técnica da query de conta autenticada do Identity. */
  IDENTITY_USER_ACCOUNT_QUERY: 'IDENTITY.USER_ACCOUNT_QUERY_ERROR',
  /** Falha técnica da query de contexto de exibição da banca do Tenancy. */
  TENANCY_BANCA_DISPLAY_QUERY: 'TENANCY.BANCA_DISPLAY_QUERY_ERROR',
  /** Falha técnica ao persistir a Party (agregado do Participants). */
  PARTICIPANTS_PARTY_SAVE: 'PARTICIPANTS.PARTY_SAVE_ERROR',
  /** Falha técnica ao buscar uma Party por id. */
  PARTICIPANTS_PARTY_FIND: 'PARTICIPANTS.PARTY_FIND_ERROR',
  /** Falha técnica ao persistir o BettingAgent (agregado do Participants). */
  PARTICIPANTS_BETTING_AGENT_SAVE: 'PARTICIPANTS.BETTING_AGENT_SAVE_ERROR',
  /** Falha técnica ao buscar um BettingAgent por id. */
  PARTICIPANTS_BETTING_AGENT_FIND: 'PARTICIPANTS.BETTING_AGENT_FIND_ERROR',
  /** Falha técnica da query de listagem/detalhe de BettingAgent. */
  PARTICIPANTS_BETTING_AGENT_QUERY: 'PARTICIPANTS.BETTING_AGENT_QUERY_ERROR',
  /** Falha técnica da query de possível duplicidade de Party. */
  PARTICIPANTS_PARTY_DUPLICATE_QUERY:
    'PARTICIPANTS.PARTY_DUPLICATE_QUERY_ERROR',
} as const;

export type TechnicalErrorCode =
  (typeof TECHNICAL_ERROR_CODES)[keyof typeof TECHNICAL_ERROR_CODES];

/**
 * Mensagem externa genérica das respostas `500` de categoria C. É deliberadamente
 * opaca — sem código interno, detalhe técnico, stack ou detalhe Prisma. Usada
 * tanto pela borda HTTP (`IdentityController.unwrap`) quanto pelo
 * `JwtCookieAuthGuard` para uma resposta simétrica.
 */
export const GENERIC_INTERNAL_ERROR_MESSAGE =
  'An unexpected error occurred. Please try again later.';

const TECHNICAL_CODE_SET: ReadonlySet<string> = new Set(
  Object.values(TECHNICAL_ERROR_CODES),
);

/** `true` quando o código representa uma falha técnica (categoria C → `500`). */
export function isTechnicalFailureCode(code: string): boolean {
  return TECHNICAL_CODE_SET.has(code);
}
