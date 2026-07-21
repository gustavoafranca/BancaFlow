import { Result } from '@bancaflow/shared';
import { UserAccount } from './user-account.entity';

export interface UserAccountRepository {
  nextId(): string;

  findById(id: string, bancaId: string): Promise<Result<UserAccount | null>>;

  findByBancaAndUsername(bancaId: string, normalizedUsername: string): Promise<Result<UserAccount | null>>;

  save(account: UserAccount): Promise<Result<void>>;

  recordLoginFailureAtomic(bancaId: string, normalizedUsername: string, now: Date): Promise<Result<UserAccount | null>>;
}
