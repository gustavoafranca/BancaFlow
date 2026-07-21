import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import type { Request } from 'express';
import { AuthContext, JwtPayload } from '../types/jwt-payload.type';
import { mapPayloadToAuthContext } from './auth-user.mapper';

export const ACCESS_TOKEN_COOKIE = 'access_token';

/** Extrai o access token do cookie host-only `access_token` (nunca Bearer). */
function accessTokenFromCookie(req: Request): string | null {
  const cookies = (req as unknown as { cookies?: Record<string, string> })
    .cookies;
  const token = cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: accessTokenFromCookie,
      ignoreExpiration: false,
      // SEM fallback inseguro (ver `SharedModule`/`validateSecuritySecrets`).
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    };
    super(options);
  }

  validate(payload: JwtPayload): AuthContext {
    return mapPayloadToAuthContext(payload);
  }
}
