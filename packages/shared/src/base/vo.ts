export interface ValueObjectConfig {}

/**
 * Base de Value Object. O valor bruto (`_value`) é `protected`: nenhum
 * consumidor externo à hierarquia de classes pode ler ou (tentar) sobrescrever
 * o valor interno diretamente — apenas através de invariantes/métodos da
 * subclasse concreta. Subclasses que precisam expor o valor publicamente
 * declaram seu próprio `get value(): T { return this._value; }` (nunca
 * reabrindo esta base).
 */
export abstract class ValueObject<T, Config extends ValueObjectConfig> {
  constructor(
    protected readonly _value: T,
    readonly config?: Config,
  ) {}

  equals(vo: ValueObject<T, Config>): boolean {
    return this._value === vo._value;
  }

  notEquals(vo: ValueObject<T, Config>): boolean {
    return !this.equals(vo);
  }
}
