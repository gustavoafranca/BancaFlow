import { Result } from '@bancaflow/shared';
import type { AuthenticatedUserAccountDto } from '../dto/authenticated-user-context.dto';

export interface AuthenticatedUserAccountQuery {
  findByUserAndBanca(userId: string, bancaId: string): Promise<Result<AuthenticatedUserAccountDto | null>>;
}
