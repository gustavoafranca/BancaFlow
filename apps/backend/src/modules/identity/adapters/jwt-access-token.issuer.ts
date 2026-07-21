import type {
  AccessTokenClaims,
  AccessTokenIssuer,
  IssuedAccessToken,
} from '@bancaflow/identity';
import { Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const DEFAULT_TTL_MINUTES = 60;

@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  private readonly ttlMinutes: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const parsed = Number(
      config.get<string>(
        'ACCESS_TOKEN_TTL_MINUTES',
        String(DEFAULT_TTL_MINUTES),
      ),
    );
    this.ttlMinutes =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MINUTES;
  }

  async issue(claims: AccessTokenClaims): Promise<Result<IssuedAccessToken>> {
    try {
      const expiresInSeconds = this.ttlMinutes * 60;
      const token = await this.jwt.signAsync(
        {
          sub: claims.sub,
          bancaId: claims.bancaId,
          sessionId: claims.sessionId,
          role: claims.role,
          mustChangePassword: claims.mustChangePassword,
        },
        { expiresIn: expiresInSeconds },
      );
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      return Result.ok({ token, expiresAt });
    } catch {
      return Result.fail('IDENTITY.ACCESS_TOKEN_ISSUE_ERROR');
    }
  }
}
