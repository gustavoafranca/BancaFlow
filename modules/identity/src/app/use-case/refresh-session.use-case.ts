import { Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { AuthResultDto } from '../../shared/dto/auth.dto';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { AccessTokenIssuer } from '../../shared/ports/access-token-issuer.port';
import { Clock } from '../../shared/ports/clock.port';
import { RefreshTokenDigester } from '../../shared/ports/refresh-token-digester.port';
import { RefreshTokenGenerator } from '../../shared/ports/refresh-token-generator.port';
import { UserAccountRepository } from '../../user-account/user-account.repository';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface RefreshSessionInput {
  refreshToken: string;
  deviceInfo?: string;
}

/**
 * Rotaciona a sessão: calcula o digest HMAC do refresh token recebido, localiza
 * a sessão, valida expiração/revogação, gera novo par de tokens (TTL 7 dias) e
 * emite novo access token. O token anterior deixa de funcionar.
 */
export class RefreshSessionUseCase implements UseCase<RefreshSessionInput, AuthResultDto> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accounts: UserAccountRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenDigester: RefreshTokenDigester,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(data: RefreshSessionInput): Promise<Result<AuthResultDto>> {
    const digest = this.refreshTokenDigester.digest(data.refreshToken ?? '');
    if (digest.isFailure) {
      return Result.fail(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const now = this.clock.now();

    // Leitura e validações de estado, fora de transação: nenhuma escrita ainda.
    const found = await this.sessions.findByDigest(digest.instance);
    if (found.isFailure) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }
    const session = found.instance;
    if (!session || session.isRevoked() || session.isExpired(now)) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const accountResult = await this.accounts.findById(session.userId, session.bancaId);
    if (accountResult.isFailure) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }
    const account = accountResult.instance;
    if (!account || !account.isActive()) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const newRefreshToken = await this.refreshTokenGenerator.generate();
    if (newRefreshToken.isFailure) {
      return Result.fail<AuthResultDto>(newRefreshToken.errors!);
    }
    const newDigest = this.refreshTokenDigester.digest(newRefreshToken.instance);
    if (newDigest.isFailure) {
      return Result.fail<AuthResultDto>(newDigest.errors!);
    }

    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    const rotated = session.rotate(newDigest.instance, expiresAt, now);
    if (rotated.isFailure) {
      return Result.fail<AuthResultDto>(rotated.errors!);
    }

    // A partir daqui: rotação + emissão de novo access token são tudo-ou-nada.
    return this.transactionManager.runInTransactionResult(async () => {
      const cas = await this.sessions.rotateIfDigestMatches(
        session.id,
        digest.instance,
        newDigest.instance,
        expiresAt,
        now,
      );
      if (cas.isFailure) {
        return Result.fail<AuthResultDto>(cas.errors!);
      }
      if (!cas.instance) {
        return Result.fail<AuthResultDto>(IDENTITY_ERRORS.SESSION_REVOKED);
      }

      const accessToken = await this.accessTokenIssuer.issue({
        sub: account.id,
        bancaId: session.bancaId,
        sessionId: session.id,
        role: account.role.value,
        mustChangePassword: account.mustChangePassword,
      });
      if (accessToken.isFailure) {
        return Result.fail<AuthResultDto>(accessToken.errors!);
      }

      return Result.ok<AuthResultDto>({
        userId: account.id,
        bancaId: session.bancaId,
        sessionId: session.id,
        role: account.role.value,
        mustChangePassword: account.mustChangePassword,
        accessToken: accessToken.instance.token,
        accessTokenExpiresAt: accessToken.instance.expiresAt,
        refreshToken: newRefreshToken.instance,
        refreshTokenExpiresAt: expiresAt,
      });
    });
  }
}
