import { Result } from '@bancaflow/shared';
import { AccessTokenClaims } from '../dto/auth.dto';

export interface IssuedAccessToken {
  token: string;
  expiresAt: Date;
}

export interface AccessTokenIssuer {
  issue(claims: AccessTokenClaims): Promise<Result<IssuedAccessToken>>;
}
