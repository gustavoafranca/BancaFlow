import { Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { AccessTokenIssuer } from '../../shared/ports/access-token-issuer.port';
import { BancaContextResolver } from '../../shared/ports/banca-context-resolver.port';
import { Clock } from '../../shared/ports/clock.port';
import { PasswordCryptoProvider } from '../../shared/ports/password-crypto.port';
import { RefreshTokenDigester } from '../../shared/ports/refresh-token-digester.port';
import { RefreshTokenGenerator } from '../../shared/ports/refresh-token-generator.port';
import { AuthResultDto } from '../../shared/dto/auth.dto';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { Session } from '../../session/session.entity';
import { SessionRepository } from '../../session/session.repository';
import { Username } from '../../user-account/vo/username.vo';
import { UserAccountRepository } from '../../user-account/user-account.repository';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface LoginInput {
  /** Extraído do host pelo backend; NUNCA vem do body. */
  codigoBanca: string;
  username: string;
  password: string;
  deviceInfo?: string;
}

/**
 * Autentica username + password dentro do contexto de banca resolvido pelo host.
 * Todas as queries usam obrigatoriamente o `bancaId` resolvido. Falhas retornam
 * uma mensagem genérica (INVALID_CREDENTIALS) para não revelar existência de
 * conta ou banca. Respeita bloqueio e zera falhas no sucesso.
 */
export class LoginUseCase implements UseCase<LoginInput, AuthResultDto> {
  constructor(
    private readonly bancaContextResolver: BancaContextResolver,
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly passwordCrypto: PasswordCryptoProvider,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenDigester: RefreshTokenDigester,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(data: LoginInput): Promise<Result<AuthResultDto>> {
    const usernameResult = Username.tryCreate(data.username);
    if (usernameResult.isFailure) {
      return Result.fail(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const banca = await this.bancaContextResolver.resolve(data.codigoBanca);
    if (banca.isFailure || !banca.instance || !banca.instance.isActive) {
      return Result.fail(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }
    const bancaId = banca.instance.bancaId;
    const now = this.clock.now();

    // Leitura simples, fora de transação: nenhuma escrita ocorre até aqui.
    const found = await this.accounts.findByBancaAndUsername(bancaId, usernameResult.instance.normalized);
    if (found.isFailure) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }
    const account = found.instance;
    if (!account || !account.isActive()) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    // Conta bloqueada: rejeita sem validar senha.
    if (account.isLocked(now)) {
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const matches = await this.passwordCrypto.compare(data.password, account.credential.passwordHash);
    if (matches.isFailure || !matches.instance) {
      // Senha incorreta: o incremento do contador é regra de negócio que
      // PERSISTE independentemente do resultado final. Escrita ATÔMICA
      // (lock pessimista no adapter — decisão 4a revisada), fora de
      // `runInTransactionResult`, para nunca ser revertida. O resultado NÃO é
      // mais ignorado silenciosamente — apenas o erro ao cliente permanece
      // genérico (nunca revela detalhes internos de infraestrutura).
      const failed = await this.accounts.recordLoginFailureAtomic(bancaId, usernameResult.instance.normalized, now);
      if (failed.isFailure) {
        // Falha de infraestrutura ao registrar a tentativa: a resposta ao
        // cliente permanece INVALID_CREDENTIALS genérico de qualquer forma.
      }
      return Result.fail<AuthResultDto>(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    // A partir daqui a senha está correta: reset do contador, criação de
    // sessão e emissão de token são tudo-ou-nada.
    return this.transactionManager.runInTransactionResult(async () => {
      const reset = account.resetLoginFailures();
      if (reset.isFailure) {
        return Result.fail<AuthResultDto>(reset.errors!);
      }
      const saveAccount = await this.accounts.save(reset.instance);
      if (saveAccount.isFailure) {
        return Result.fail<AuthResultDto>(saveAccount.errors!);
      }

      const refreshToken = await this.refreshTokenGenerator.generate();
      if (refreshToken.isFailure) {
        return Result.fail<AuthResultDto>(refreshToken.errors!);
      }
      const digest = this.refreshTokenDigester.digest(refreshToken.instance);
      if (digest.isFailure) {
        return Result.fail<AuthResultDto>(digest.errors!);
      }

      const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
      const session = Session.tryCreate({
        id: this.sessions.nextId(),
        userId: account.id,
        bancaId,
        refreshTokenDigest: digest.instance,
        expiresAt,
        revokedAt: null,
        deviceInfo: data.deviceInfo ?? null,
      });
      if (session.isFailure) {
        return Result.fail<AuthResultDto>(session.errors!);
      }

      const savedSession = await this.sessions.save(session.instance);
      if (savedSession.isFailure) {
        return Result.fail<AuthResultDto>(savedSession.errors!);
      }

      const accessToken = await this.accessTokenIssuer.issue({
        sub: account.id,
        bancaId,
        sessionId: session.instance.id,
        role: account.role.value,
        mustChangePassword: account.mustChangePassword,
      });
      if (accessToken.isFailure) {
        return Result.fail<AuthResultDto>(accessToken.errors!);
      }

      return Result.ok<AuthResultDto>({
        userId: account.id,
        bancaId,
        sessionId: session.instance.id,
        role: account.role.value,
        mustChangePassword: account.mustChangePassword,
        accessToken: accessToken.instance.token,
        accessTokenExpiresAt: accessToken.instance.expiresAt,
        refreshToken: refreshToken.instance,
        refreshTokenExpiresAt: expiresAt,
      });
    });
  }
}
