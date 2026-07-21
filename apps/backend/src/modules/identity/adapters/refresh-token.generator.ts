import type { RefreshTokenGenerator } from '@bancaflow/identity';
import { Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

@Injectable()
export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): Promise<Result<string>> {
    try {
      return Promise.resolve(Result.ok(randomBytes(64).toString('hex')));
    } catch {
      return Promise.resolve(
        Result.fail('IDENTITY.REFRESH_TOKEN_GENERATE_ERROR'),
      );
    }
  }
}
