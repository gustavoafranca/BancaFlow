import { Injectable } from '@nestjs/common';
import { Result } from '@bancaflow/shared';
import type { TemporaryPasswordGenerator } from '@bancaflow/identity';
import { randomInt } from 'node:crypto';
import { TEMPORARY_PASSWORD_WORDLIST } from './temporary-password.wordlist';

// Conjuntos sem caracteres ambíguos (0/O, 1/l/I) para leitura/digitação
// confortável por telefone ou em voz alta.
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?';
const WORD_COUNT = 5;
const DIGIT_COUNT = 2;
const SEPARATOR = '-';

/**
 * Gera uma senha temporária administrativa no formato humano da decisão D1
 * de `refine-tenant-user-administration-experience`:
 *
 *   Palavra-palavra-palavra-palavra-palavra-47!
 *
 * 5 palavras de um vocabulário estável de 2048 termos (índice escolhido por
 * CSPRNG via `randomInt`), 2 dígitos sem caracteres ambíguos e 1 símbolo de
 * um conjunto pequeno e conhecido, unidos por `-`. A primeira palavra é
 * capitalizada (satisfaz maiúscula); as demais ficam em minúsculas.
 *
 * Entropia: 2048^5 * 8^2 * 8 = 2^55 * 2^6 * 2^3 = 2^64 combinações. Para uma
 * senha temporária CSPRNG exibida uma única vez, com troca obrigatória no
 * primeiro acesso e fluxo de autenticação rate-limited, 64 bits são muito
 * superiores ao necessário e o formato prioriza ser fácil de ditar/digitar
 * sem confusão — ver design.md D1 para a análise completa.
 */
@Injectable()
export class CryptoTemporaryPasswordGenerator implements TemporaryPasswordGenerator {
  generate(): Result<string> {
    try {
      const words: string[] = [];
      for (let i = 0; i < WORD_COUNT; i++) {
        const word =
          TEMPORARY_PASSWORD_WORDLIST[
            randomInt(TEMPORARY_PASSWORD_WORDLIST.length)
          ];
        words.push(i === 0 ? capitalize(word) : word);
      }
      const digits = Array.from(
        { length: DIGIT_COUNT },
        () => DIGITS[randomInt(DIGITS.length)],
      ).join('');
      const symbol = SYMBOLS[randomInt(SYMBOLS.length)];

      return Result.ok([...words, `${digits}${symbol}`].join(SEPARATOR));
    } catch {
      return Result.fail('IDENTITY.TEMP_PASSWORD_GENERATE_ERROR');
    }
  }
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
