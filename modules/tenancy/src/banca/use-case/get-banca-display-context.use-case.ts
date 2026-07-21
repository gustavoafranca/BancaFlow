import { Result, UseCase } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '../../shared/errors/tenancy.errors';
import type { BancaDisplayContextQuery } from '../query/banca-display-context.query';

export interface GetBancaDisplayContextInput {
  bancaId: string;
}

export interface GetBancaDisplayContextOutput {
  bancaId: string;
  codigoBanca: string;
  nome: string;
}

export class GetBancaDisplayContextUseCase implements UseCase<
  GetBancaDisplayContextInput,
  GetBancaDisplayContextOutput
> {
  constructor(private readonly query: BancaDisplayContextQuery) {}

  async execute(data: GetBancaDisplayContextInput): Promise<Result<GetBancaDisplayContextOutput>> {
    const found = await this.query.findActiveById(data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    if (!found.instance) {
      return Result.fail(TENANCY_ERRORS.BANCA_NOT_FOUND);
    }

    return Result.ok({
      bancaId: found.instance.bancaId,
      codigoBanca: found.instance.codigoBanca,
      nome: found.instance.nome,
    });
  }
}
