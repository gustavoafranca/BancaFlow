import { Result } from '@bancaflow/shared';

export interface RefreshTokenDigester {
  digest(token: string): Result<string>;
}
