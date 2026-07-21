import { AccountRoleType } from '@bancaflow/shared';

export interface AccessTokenClaims {
  sub: string; // userId
  bancaId: string;
  sessionId: string;
  role: AccountRoleType;
  mustChangePassword: boolean;
}

export interface AuthResultDto {
  userId: string;
  bancaId: string;
  sessionId: string;
  role: AccountRoleType;
  mustChangePassword: boolean;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
