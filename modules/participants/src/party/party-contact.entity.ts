import { Entity, EntityProps, Id, Result } from '@bancaflow/shared';
import { Phone } from './vo/phone.vo';

export interface PartyContactProps extends EntityProps {
  phone: string; // valor normalizado (dígitos)
  label?: string | null;
}

/**
 * Entidade filha do agregado `Party`. Persistida em tabela própria mas criada e
 * alterada somente através do agregado `Party` (sem repositório público próprio).
 * Usa ctor privado + `rebuild()` com spread raso — nunca `cloneWith` genérico,
 * que corrompe `Date`.
 */
export class PartyContact extends Entity<PartyContact, PartyContactProps> {
  private constructor(props: PartyContactProps) {
    super(props);
  }

  private rebuild(overrides: Partial<PartyContactProps>): Result<PartyContact> {
    return PartyContact.tryCreate({ ...this.props, ...overrides });
  }

  get phone(): Phone {
    return Phone.create(this.props.phone);
  }

  /** Valor normalizado (dígitos) para persistência/duplicidade. */
  get phoneValue(): string {
    return this.props.phone;
  }

  get label(): string | null {
    return this.props.label ?? null;
  }

  static create(props: PartyContactProps): PartyContact {
    const result = PartyContact.tryCreate(props);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(props: PartyContactProps): Result<PartyContact> {
    const id = Id.tryCreate(props.id);
    const phone = Phone.tryCreate(props.phone);

    const attrs = Result.combine([id, phone]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    const label = props.label?.trim() ? props.label.trim() : null;

    return Result.ok(
      new PartyContact({
        ...props,
        id: id.instance.value,
        phone: phone.instance.value,
        label,
      }),
    );
  }
}
