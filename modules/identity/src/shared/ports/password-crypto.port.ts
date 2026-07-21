import { Result } from '@bancaflow/shared';

export interface PasswordCryptoProvider {
  hash(plain: string): Promise<Result<string>>;
  compare(plain: string, hash: string): Promise<Result<boolean>>;
}
