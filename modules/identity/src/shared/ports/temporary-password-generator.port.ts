import { Result } from '@bancaflow/shared';

export interface TemporaryPasswordGenerator {
  generate(): Result<string>;
}
