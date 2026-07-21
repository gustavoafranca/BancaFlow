import { Result, UseCase } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '../../shared/errors/tenancy.errors';
import { BancaRepository } from '../banca.repository';
import { CodigoBanca } from '../vo/codigo-banca.vo';

export interface GetBancaContextInput {
  codigoBanca: string;
}

export interface GetBancaContextOutput {
  bancaId: string;
  isActive: boolean;
}

export class GetBancaContextUseCase implements UseCase<GetBancaContextInput, GetBancaContextOutput> {
  constructor(private readonly bancas: BancaRepository) {}

  async execute(data: GetBancaContextInput): Promise<Result<GetBancaContextOutput>> {
    const codigo = CodigoBanca.tryCreate(data.codigoBanca);
    if (codigo.isFailure) {
      return Result.fail(TENANCY_ERRORS.BANCA_NOT_FOUND);
    }

    const found = await this.bancas.findByCodigo(codigo.instance.normalized);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    if (!found.instance) {
      return Result.fail(TENANCY_ERRORS.BANCA_NOT_FOUND);
    }

    return Result.ok({
      bancaId: found.instance.id,
      isActive: found.instance.isActive(),
    });
  }
}
