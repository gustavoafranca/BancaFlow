import { Entity, EntityProps, Id, Result } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '../shared/errors/tenancy.errors';
import { BancaStatus, BancaStatusType } from './vo/banca-status.vo';
import { CodigoBanca } from './vo/codigo-banca.vo';

export interface BancaProps extends EntityProps {
  codigoBanca: string; // valor bruto (raw)
  nome: string;
  status: BancaStatusType;
}

export class Banca extends Entity<Banca, BancaProps> {
  private constructor(props: BancaProps) {
    super(props);
  }

  private rebuild(overrides: Partial<BancaProps>): Result<Banca> {
    return Banca.tryCreate({ ...this.props, ...overrides });
  }

  get codigoBanca(): CodigoBanca {
    return CodigoBanca.create(this.props.codigoBanca);
  }

  get nome(): string {
    return this.props.nome;
  }

  get status(): BancaStatus {
    return BancaStatus.create(this.props.status);
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  activate(): Result<Banca> {
    return this.rebuild({ status: BancaStatus.ACTIVE });
  }

  deactivate(): Result<Banca> {
    return this.rebuild({ status: BancaStatus.INACTIVE });
  }

  static create(props: BancaProps): Banca {
    const result = Banca.tryCreate(props);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(props: BancaProps): Result<Banca> {
    const id = Id.tryCreate(props.id);
    const codigoBanca = CodigoBanca.tryCreate(props.codigoBanca);
    const status = BancaStatus.tryCreate(props.status);

    const attrs = Result.combine([id, codigoBanca, status]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    const nome = (props.nome ?? '').trim();
    if (!nome) {
      return Result.fail(TENANCY_ERRORS.NOME_INVALID);
    }

    return Result.ok(
      new Banca({
        ...props,
        id: id.instance.value,
        codigoBanca: codigoBanca.instance.normalized,
        nome,
        status: status.instance.value,
      }),
    );
  }
}
