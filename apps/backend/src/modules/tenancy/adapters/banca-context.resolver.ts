import type {
  BancaContext,
  BancaContextResolver as IBancaContextResolver,
} from '@bancaflow/identity';
import { Result } from '@bancaflow/shared';
import { GetBancaContextUseCase } from '@bancaflow/tenancy';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BancaContextResolver implements IBancaContextResolver {
  constructor(private readonly getBancaContext: GetBancaContextUseCase) {}

  async resolve(codigoBanca: string): Promise<Result<BancaContext>> {
    return this.getBancaContext.execute({ codigoBanca });
  }
}
