import type { PasswordCryptoProvider } from '@bancaflow/identity';
import { Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

const DEFAULT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordCryptoProvider implements PasswordCryptoProvider {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    const parsed = Number(
      config.get<string>('BCRYPT_ROUNDS', String(DEFAULT_ROUNDS)),
    );
    this.rounds =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROUNDS;
  }

  async hash(plain: string): Promise<Result<string>> {
    try {
      const hash = await bcrypt.hash(plain, this.rounds);
      return Result.ok(hash);
    } catch {
      return Result.fail('IDENTITY.PASSWORD_HASH_ERROR');
    }
  }

  async compare(plain: string, hash: string): Promise<Result<boolean>> {
    try {
      const matches = await bcrypt.compare(plain, hash);
      return Result.ok(matches);
    } catch {
      return Result.fail('IDENTITY.PASSWORD_COMPARE_ERROR');
    }
  }
}
