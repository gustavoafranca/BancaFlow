import { ValueObject, ValueObjectConfig } from '../../src';

interface TestConfig extends ValueObjectConfig {
  attribute?: string;
}

class TestValueObject extends ValueObject<string, TestConfig> {
  get value(): string {
    return this._value;
  }
}

describe('ValueObject', () => {
  test('should store value and config', () => {
    const vo = new TestValueObject('abc', { attribute: 'name' });

    expect(vo.value).toBe('abc');
    expect(vo.config).toEqual({ attribute: 'name' });
  });

  test('should return true when values are equal', () => {
    const left = new TestValueObject('same');
    const right = new TestValueObject('same', { attribute: 'other' });

    expect(left.equals(right)).toBe(true);
    expect(left.notEquals(right)).toBe(false);
  });

  test('should return false when values are different', () => {
    const left = new TestValueObject('left');
    const right = new TestValueObject('right');

    expect(left.equals(right)).toBe(false);
    expect(left.notEquals(right)).toBe(true);
  });

  describe('encapsulamento (regressão pós-review)', () => {
    test('o valor bruto (_value) não é acessível publicamente fora da hierarquia da classe', () => {
      const vo = new TestValueObject('abc', { attribute: 'name' });
      // @ts-expect-error _value agora é protected — inacessível de fora da hierarquia da classe.
      expect(vo._value).toBe('abc');
      // Leitura pública segue disponível apenas via getter explícito da subclasse concreta.
      expect(vo.value).toBe('abc');
    });
  });
});
