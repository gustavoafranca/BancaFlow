import type { AccountRoleType } from '@bancaflow/shared';

export interface AuthenticatedUserAccountDto {
  userId: string;
  bancaId: string;
  username: string;
  name: string;
  email: string | null;
  role: AccountRoleType;
  version: number;
}

export interface AuthenticatedUserContextDto {
  userId: string;
  username: string;
  name: string;
  email: string | null;
  role: AccountRoleType;
  version: number;
  banca: {
    bancaId: string;
    codigoBanca: string;
    name: string;
  };
}
