import { Prisma } from '@prisma/client';

/** Contexto seguro para o log estruturado de uma falha técnica (categoria C). */
export interface TechnicalFailureContext {
  /** Origem lógica da falha (ex.: 'prisma-adapter', 'JwtCookieAuthGuard'). */
  scope: string;
  /** Operação técnica (ex.: 'AuthenticatedUserAccountQueryPrisma.findByUserAndBanca'). */
  operation?: string;
  /** Código técnico estável associado à falha (categoria C). */
  technicalCode?: string;
  /** Códigos de domínio já traduzidos e propagados por um `Result.fail`. */
  codes?: string[];
  /** Identificador de correlação com a requisição, quando disponível. */
  correlationId?: string;
}

/**
 * Extrai um resumo SEGURO de um erro desconhecido: o nome da classe e, para
 * erros conhecidos do Prisma, o código estável (ex.: `P2002`). NUNCA inclui
 * `message`, `meta`, stack, SQL, parâmetros ou valores — que podem carregar
 * dados de schema/constraint ou de negócio sensíveis.
 */
function safeErrorSummary(error: unknown): {
  errorName: string;
  prismaCode?: string;
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { errorName: error.constructor.name, prismaCode: error.code };
  }
  if (error instanceof Error) {
    return { errorName: error.constructor.name };
  }
  return { errorName: typeof error };
}

/**
 * Registra uma falha técnica (categoria C) como log estruturado e sanitizado:
 * escopo, operação, código técnico e um resumo seguro do erro. Serve tanto aos
 * adapters (via [safeErrorCode]) quanto ao guard. NUNCA registra o objeto de
 * erro bruto, sua `message`, `meta` ou stack — apenas metadados de correlação
 * e diagnóstico seguros. A resposta HTTP externa permanece genérica.
 */
export function logTechnicalFailure(
  error: unknown,
  context: TechnicalFailureContext,
): void {
  const entry = {
    level: 'error',
    kind: 'technical-failure',
    ...context,
    ...safeErrorSummary(error),
  };
  console.error(JSON.stringify(entry));
}

/**
 * Traduz qualquer erro de infraestrutura (Prisma ou não) para um código de
 * domínio estável. NUNCA retorna `error.message` bruto — ele pode conter
 * detalhes de schema/constraint/SQL que não devem vazar na resposta HTTP. A
 * causa é registrada apenas no servidor, de forma estruturada e sanitizada
 * ([logTechnicalFailure]), nunca devolvida ao chamador.
 */
export function safeErrorCode(
  error: unknown,
  fallback: string,
  context?: {
    scope?: string;
    operation?: string;
    correlationId?: string;
  },
): string {
  logTechnicalFailure(error, {
    scope: context?.scope ?? 'prisma-adapter',
    operation: context?.operation,
    technicalCode: fallback,
    correlationId: context?.correlationId,
  });
  return fallback;
}

/** `true` quando o erro é uma violação de constraint UNIQUE do Prisma (P2002). */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
