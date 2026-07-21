import { Result } from '@bancaflow/shared';

export interface RefreshTokenGenerator {
  generate(): Promise<Result<string>>;
}
