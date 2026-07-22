import { Entity, EntityProps, Id, Result } from '@bancaflow/shared';
import { City } from './vo/city.vo';
import { EffectivePeriod } from './vo/effective-period.vo';
import { Neighborhood } from './vo/neighborhood.vo';

export interface PartyAddressProps extends EntityProps {
  street?: string | null;
  number?: string | null;
  neighborhood: string; // exibição
  /** Derivado em `tryCreate` a partir de `neighborhood`. */
  neighborhoodNormalized?: string;
  city: string; // exibição
  /** Derivado em `tryCreate` a partir de `city`. */
  cityNormalized?: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

/**
 * Entidade filha do agregado `Party`. Bairro e cidade são obrigatórios; rua e
 * número são opcionais. Preserva o valor de exibição e o normalizado de bairro/
 * cidade. Começa ativa com uma vigência aberta iniciando na criação. Persistida
 * em tabela própria, criada/alterada somente pelo agregado `Party`.
 */
export class PartyAddress extends Entity<PartyAddress, PartyAddressProps> {
  private constructor(props: PartyAddressProps) {
    super(props);
  }

  private rebuild(overrides: Partial<PartyAddressProps>): Result<PartyAddress> {
    return PartyAddress.tryCreate({ ...this.props, ...overrides });
  }

  get street(): string | null {
    return this.props.street ?? null;
  }

  get number(): string | null {
    return this.props.number ?? null;
  }

  get neighborhood(): Neighborhood {
    return Neighborhood.create(this.props.neighborhood);
  }

  get city(): City {
    return City.create(this.props.city);
  }

  get neighborhoodNormalized(): string {
    return this.props.neighborhoodNormalized!;
  }

  get cityNormalized(): string {
    return this.props.cityNormalized!;
  }

  get effectivePeriod(): EffectivePeriod {
    return EffectivePeriod.create({
      effectiveFrom: this.props.effectiveFrom,
      effectiveTo: this.props.effectiveTo ?? null,
    });
  }

  get isActive(): boolean {
    return (this.props.effectiveTo ?? null) === null;
  }

  static create(props: PartyAddressProps): PartyAddress {
    const result = PartyAddress.tryCreate(props);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(props: PartyAddressProps): Result<PartyAddress> {
    const id = Id.tryCreate(props.id);
    const neighborhood = Neighborhood.tryCreate(props.neighborhood);
    const city = City.tryCreate(props.city);
    const period = EffectivePeriod.tryCreate({
      effectiveFrom: props.effectiveFrom,
      effectiveTo: props.effectiveTo ?? null,
    });

    const attrs = Result.combine([id, neighborhood, city, period]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    const street = props.street?.trim() ? props.street.trim() : null;
    const number = props.number?.trim() ? props.number.trim() : null;

    return Result.ok(
      new PartyAddress({
        ...props,
        id: id.instance.value,
        street,
        number,
        neighborhood: neighborhood.instance.display,
        neighborhoodNormalized: neighborhood.instance.normalized,
        city: city.instance.display,
        cityNormalized: city.instance.normalized,
        effectiveFrom: period.instance.effectiveFrom,
        effectiveTo: period.instance.effectiveTo,
      }),
    );
  }
}
