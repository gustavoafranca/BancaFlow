export type ApiErrorResponse = {
  statusCode: number;
  error: string;
  message: string[];
  /** Código de domínio estável (ex.: `PARTICIPANTS.POSSIBLE_DUPLICATE`), quando fornecido. */
  code?: string;
  /** Payload auxiliar da falha (ex.: candidatos de possível duplicidade), quando fornecido. */
  details?: unknown[];
  path?: string;
  timestamp: string;
};
