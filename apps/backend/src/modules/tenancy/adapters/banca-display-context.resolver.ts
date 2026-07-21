import { Injectable } from '@nestjs/common';
import { Result } from '@bancaflow/shared';
import type {
  BancaDisplayContext,
  BancaDisplayContextResolver as IBancaDisplayContextResolver,
} from '@bancaflow/identity';
import {
  GetBancaDisplayContextUseCase,
  TENANCY_ERRORS,
} from '@bancaflow/tenancy';

/**
 * Adapter que satisfaz a port de saída `BancaDisplayContextResolver` do Identity,
 * delegando à consulta autenticada de Tenancy (`GetBancaDisplayContextUseCase`).
 * Mapeia `nome` (Tenancy) para `name` (borda do Identity). A entidade `Banca`
 * nunca cruza esta fronteira.
 *
 * Traduz a representação de Tenancy para o contrato da port do Identity,
 * PRESERVANDO a distinção entre ausência esperada e falha técnica (D7):
 *  - banca ativa → `Result.ok(context)`;
 *  - ausência/inatividade (`BANCA_NOT_FOUND`) → `Result.ok(null)` (categoria B);
 *  - falha técnica (qualquer outro código) → `Result.fail(...)` (categoria C),
 *    NUNCA colapsada em ausência.
 */
@Injectable()
export class BancaDisplayContextResolver implements IBancaDisplayContextResolver {
  constructor(
    private readonly getBancaDisplayContext: GetBancaDisplayContextUseCase,
  ) {}

  async resolve(bancaId: string): Promise<Result<BancaDisplayContext | null>> {
    const result = await this.getBancaDisplayContext.execute({ bancaId });
    if (result.isFailure) {
      const errors = result.errors ?? [];
      if (errors.includes(TENANCY_ERRORS.BANCA_NOT_FOUND)) {
        // Categoria B: ausência/inatividade esperada.
        return Result.ok(null);
      }
      // Categoria C: falha técnica preservada.
      return Result.fail(errors);
    }
    const banca = result.instance;
    return Result.ok({
      bancaId: banca.bancaId,
      codigoBanca: banca.codigoBanca,
      name: banca.nome,
    });
  }
}
