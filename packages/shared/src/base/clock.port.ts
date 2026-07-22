/**
 * Porta de relógio injetável, comum a todos os módulos de domínio: fornece a
 * data corrente para auditoria e vigências, em vez de `new Date()` direto,
 * tornando os casos de uso determinísticos em teste. Implementada no
 * composition root (`apps/backend`) por um `SystemClock` compartilhado.
 */
export interface Clock {
  now(): Date;
}
