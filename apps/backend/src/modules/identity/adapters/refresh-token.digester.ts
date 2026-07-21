import type { RefreshTokenDigester } from '@bancaflow/identity';
import { Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

@Injectable()
export class HmacRefreshTokenDigester implements RefreshTokenDigester {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>(
      'REFRESH_TOKEN_SECRET',
      'dev-refresh-secret',
    );
  }

  digest(token: string): Result<string> {
    const value = (token ?? '').trim();
    if (!value) {
      return Result.fail('IDENTITY.INVALID_REFRESH_TOKEN');
    }
    const digest = createHmac('sha256', this.secret)
      .update(value)
      .digest('hex');
    return Result.ok(digest);
  }
}
