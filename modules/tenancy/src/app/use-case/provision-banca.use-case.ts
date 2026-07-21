import { CreateUserAccountPort } from '@bancaflow/identity';
import { Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { Banca } from '../../banca/banca.entity';
import { BancaRepository } from '../../banca/banca.repository';
import { BancaStatus } from '../../banca/vo/banca-status.vo';
import { CodigoBanca } from '../../banca/vo/codigo-banca.vo';
import { TENANCY_ERRORS } from '../../shared/errors/tenancy.errors';

export interface ProvisionBancaOwnerInput {
  username: string;
  name: string;
  password: string;
  email?: string;
}

export interface ProvisionBancaInput {
  codigoBanca: string;
  nome: string;
  owner: ProvisionBancaOwnerInput;
}

export interface ProvisionBancaOutput {
  bancaId: string;
  userId: string;
}

export class ProvisionBancaUseCase implements UseCase<ProvisionBancaInput, ProvisionBancaOutput> {
  constructor(
    private readonly bancas: BancaRepository,
    private readonly createUserAccount: CreateUserAccountPort,
    private readonly tx: TransactionManager,
  ) {}

  async execute(data: ProvisionBancaInput): Promise<Result<ProvisionBancaOutput>> {
    const codigo = CodigoBanca.tryCreate(data.codigoBanca);
    if (codigo.isFailure) {
      return Result.fail(codigo.errors!);
    }

    const exists = await this.bancas.existsByCodigo(codigo.instance.normalized);
    if (exists.isFailure) {
      return Result.fail(exists.errors!);
    }
    if (exists.instance) {
      return Result.fail(TENANCY_ERRORS.CODIGO_ALREADY_EXISTS);
    }

    return Result.tryAsync<ProvisionBancaOutput>(() =>
      this.tx.runInTransaction(async () => {
        const banca = Banca.tryCreate({
          id: this.bancas.nextId(),
          codigoBanca: codigo.instance.raw,
          nome: data.nome,
          status: BancaStatus.ACTIVE,
        });
        if (banca.isFailure) {
          throw new Error(banca.errors!.join(','));
        }

        const saved = await this.bancas.save(banca.instance);
        if (saved.isFailure) {
          throw new Error(saved.errors!.join(','));
        }

        const account = await this.createUserAccount.execute({
          bancaId: banca.instance.id,
          username: data.owner.username,
          name: data.owner.name,
          password: data.owner.password,
          email: data.owner.email,
          role: 'OWNER',
        });
        if (account.isFailure) {
          throw new Error(account.errors!.join(','));
        }

        return Result.ok<ProvisionBancaOutput>({
          bancaId: banca.instance.id,
          userId: account.instance.userId,
        });
      }),
    );
  }
}
