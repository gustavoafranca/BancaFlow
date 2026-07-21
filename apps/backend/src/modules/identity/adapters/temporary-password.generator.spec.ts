import * as crypto from 'node:crypto';
import { StrongPassword } from '@bancaflow/shared';
import { CryptoTemporaryPasswordGenerator } from './temporary-password.generator';
import { TEMPORARY_PASSWORD_WORDLIST } from './temporary-password.wordlist';

// `node:crypto` expõe `randomInt` como propriedade não configurável — não dá
// para `jest.spyOn` diretamente. Mocka o módulo preservando a implementação
// real por padrão (todos os outros testes exercitam o CSPRNG de verdade);
// só o teste de falha segura sobrescreve a implementação.
jest.mock('node:crypto', () => {
  const actual =
    jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, randomInt: jest.fn(actual.randomInt) };
});

// Regex do formato humano da decisão D1: 5 palavras (primeira capitalizada,
// demais minúsculas), separadas por `-`, seguidas de 2 dígitos sem
// caracteres ambíguos e 1 símbolo de um conjunto pequeno conhecido.
const FORMAT = /^[A-Z][a-z]+(?:-[a-z]+){4}-[2-9]{2}[!@#$%&*?]$/;
const AMBIGUOUS_CHARS = /[0O1lI]/;

describe('CryptoTemporaryPasswordGenerator', () => {
  const generator = new CryptoTemporaryPasswordGenerator();

  it('gera uma senha que satisfaz StrongPassword', () => {
    for (let i = 0; i < 50; i++) {
      const result = generator.generate();
      expect(result.isOk).toBe(true);
      expect(StrongPassword.isStrong(result.instance)).toBe(true);
    }
  });

  it('sempre segue o formato humano de 5 palavras + 2 dígitos + 1 símbolo', () => {
    for (let i = 0; i < 50; i++) {
      const value = generator.generate().instance;
      expect(value).toMatch(FORMAT);
    }
  });

  it('nunca contém caracteres ambíguos (0/O, 1/l/I) no bloco de dígitos', () => {
    for (let i = 0; i < 50; i++) {
      const value = generator.generate().instance;
      const digitsBlock = value.split('-').at(-1)!;
      const digitsOnly = digitsBlock.slice(0, 2);
      expect(digitsOnly).not.toMatch(AMBIGUOUS_CHARS);
    }
  });

  it('usa apenas palavras do vocabulário canônico de 2048 termos', () => {
    const wordlist = new Set(TEMPORARY_PASSWORD_WORDLIST);
    for (let i = 0; i < 50; i++) {
      const value = generator.generate().instance;
      const segments = value.split('-');
      const words = segments.slice(0, 5);
      words.forEach((word, index) => {
        const normalized =
          index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word;
        expect(wordlist.has(normalized)).toBe(true);
      });
    }
  });

  it('a primeira palavra é capitalizada e as demais ficam em minúsculas', () => {
    const value = generator.generate().instance;
    const [first, second, third, fourth, fifth] = value.split('-');
    expect(first[0]).toBe(first[0].toUpperCase());
    expect(first.slice(1)).toBe(first.slice(1).toLowerCase());
    for (const word of [second, third, fourth, fifth]) {
      expect(word).toBe(word.toLowerCase());
    }
  });

  it('produz senhas variadas entre chamadas (não é determinístico/fixo)', () => {
    const values = new Set(
      Array.from({ length: 20 }, () => generator.generate().instance),
    );
    expect(values.size).toBeGreaterThan(1);
  });

  it('vocabulário tem exatamente 2048 palavras únicas (entropia de 2^11 por palavra)', () => {
    expect(TEMPORARY_PASSWORD_WORDLIST.length).toBe(2048);
    expect(new Set(TEMPORARY_PASSWORD_WORDLIST).size).toBe(2048);
  });

  it('retorna Result.fail (não lança exceção) se o CSPRNG subjacente falhar', () => {
    const mockedRandomInt = crypto.randomInt as jest.Mock;
    const original = mockedRandomInt.getMockImplementation();
    mockedRandomInt.mockImplementation(() => {
      throw new Error('CSPRNG unavailable');
    });
    try {
      const result = generator.generate();
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain('IDENTITY.TEMP_PASSWORD_GENERATE_ERROR');
    } finally {
      mockedRandomInt.mockImplementation(original);
    }
  });
});
