import { hasPermission as accessControlHasPermission, type PermissionKey } from '@bancaflow/access-control';
import { AccountRoleType, Id, Result, TransactionManager } from '@bancaflow/shared';
import { AccessTokenIssuer, IssuedAccessToken } from '../../src/shared/ports/access-token-issuer.port';
import { AccessTokenClaims } from '../../src/shared/dto/auth.dto';
import { BancaContext, BancaContextResolver } from '../../src/shared/ports/banca-context-resolver.port';
import { Clock } from '../../src/shared/ports/clock.port';
import { PasswordCryptoProvider } from '../../src/shared/ports/password-crypto.port';
import { PermissionChecker } from '../../src/shared/ports/permission-checker.port';
import { RefreshTokenDigester } from '../../src/shared/ports/refresh-token-digester.port';
import { RefreshTokenGenerator } from '../../src/shared/ports/refresh-token-generator.port';
import { TemporaryPasswordGenerator } from '../../src/shared/ports/temporary-password-generator.port';
import { UserAccount } from '../../src/user-account/user-account.entity';
import { UserAccountRepository } from '../../src/user-account/user-account.repository';
import { Session } from '../../src/session/session.entity';
import { SessionRepository } from '../../src/session/session.repository';

/**
 * Delega para o catálogo real de `@bancaflow/access-control` (já exaustivamente
 * testado ali) em vez de um stub que sempre autoriza — testes de Identity
 * continuam exercitando a checagem de permissão de verdade, não uma suposição.
 */
export class RealPermissionChecker implements PermissionChecker {
  hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean {
    return accessControlHasPermission(actorRole, permissionKey);
  }
}

/**
 * Sempre nega, registrando os argumentos da última chamada — usado para provar
 * que um caso de uso realmente consulta a `PermissionKey` correta e para o
 * caminho de negação, distinto de `RealPermissionChecker` (onde as 3 chaves de
 * autoatendimento são concedidas a todos os papéis e nunca exercitam o `false`).
 */
export class DenyAllPermissionChecker implements PermissionChecker {
  lastArgs?: { actorRole: AccountRoleType; permissionKey: PermissionKey };
  hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean {
    this.lastArgs = { actorRole, permissionKey };
    return false;
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  set(date: Date): void {
    this.current = date;
  }
}

export class PassthroughTransactionManager implements TransactionManager {
  async runInTransaction<T>(operation: (ctx: unknown) => Promise<T>): Promise<T> {
    return operation({});
  }

  async runInTransactionResult<T>(operation: (ctx: unknown) => Promise<Result<T>>): Promise<Result<T>> {
    return operation({});
  }
}

/**
 * Simula o rollback real do Prisma: se o callback retornar `Result.fail`, o
 * estado dos repositórios fake é restaurado a partir de um snapshot tirado
 * antes da execução (equivalente ao comportamento esperado de
 * `runInTransactionResult` no adapter concreto).
 */
export class RollbackOnFailureTransactionManager implements TransactionManager {
  constructor(private readonly repos: { snapshot(): unknown; restore(snap: unknown): void }[]) {}

  async runInTransaction<T>(operation: (ctx: unknown) => Promise<T>): Promise<T> {
    return operation({});
  }

  async runInTransactionResult<T>(operation: (ctx: unknown) => Promise<Result<T>>): Promise<Result<T>> {
    const snapshots = this.repos.map((repo) => repo.snapshot());
    const result = await operation({});
    if (result.isFailure) {
      this.repos.forEach((repo, index) => repo.restore(snapshots[index]));
    }
    return result;
  }
}

export class InMemoryUserAccountRepository implements UserAccountRepository {
  private readonly store = new Map<string, UserAccount>();
  failFindById = false;
  failFindByBancaAndUsername = false;
  failSave = false;
  failRecordLoginFailureAtomic = false;
  /** Espião: número de chamadas a `save()`, para provar que uma escrita NÃO ocorreu. */
  saveCallCount = 0;
  /** Espião: número de chamadas a `recordLoginFailureAtomic()`. */
  recordLoginFailureAtomicCallCount = 0;

  constructor(seed: UserAccount[] = []) {
    seed.forEach((a) => this.store.set(a.id, a));
  }

  nextId(): string {
    return Id.createUUID();
  }

  async findById(id: string, bancaId: string): Promise<Result<UserAccount | null>> {
    if (this.failFindById) {
      return Result.fail('USER_ACCOUNT_FIND_BY_ID_ERROR');
    }
    const account = this.store.get(id);
    if (!account || account.bancaId !== bancaId) {
      return Result.ok(null);
    }
    return Result.ok(account);
  }

  async findByBancaAndUsername(bancaId: string, normalizedUsername: string): Promise<Result<UserAccount | null>> {
    if (this.failFindByBancaAndUsername) {
      return Result.fail('USER_ACCOUNT_FIND_BY_USERNAME_ERROR');
    }
    for (const account of this.store.values()) {
      if (account.bancaId === bancaId && account.username.normalized === normalizedUsername) {
        return Result.ok(account);
      }
    }
    return Result.ok(null);
  }

  async save(account: UserAccount): Promise<Result<void>> {
    this.saveCallCount += 1;
    if (this.failSave) {
      return Result.fail('USER_ACCOUNT_SAVE_ERROR');
    }
    this.store.set(account.id, account);
    return Result.ok();
  }

  /**
   * Fake do incremento atômico (P1-3). Simula o `SELECT ... FOR UPDATE` +
   * read-modify-write como uma operação única e síncrona (não há concorrência
   * real de fato num fake in-memory single-threaded, mas o contrato — reler,
   * aplicar `recordLoginFailure`, persistir — é o mesmo do adapter real).
   */
  async recordLoginFailureAtomic(
    bancaId: string,
    normalizedUsername: string,
    now: Date,
  ): Promise<Result<UserAccount | null>> {
    this.recordLoginFailureAtomicCallCount += 1;
    if (this.failRecordLoginFailureAtomic) {
      return Result.fail('USER_ACCOUNT_RECORD_LOGIN_FAILURE_ERROR');
    }
    const found = await this.findByBancaAndUsername(bancaId, normalizedUsername);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    const account = found.instance;
    if (!account) {
      return Result.ok(null);
    }
    const failed = account.recordLoginFailure(now);
    if (failed.isFailure) {
      return Result.fail(failed.errors!);
    }
    this.store.set(failed.instance.id, failed.instance);
    return Result.ok(failed.instance);
  }

  get(id: string): UserAccount | undefined {
    return this.store.get(id);
  }

  snapshot(): Map<string, UserAccount> {
    return new Map(this.store);
  }

  restore(snap: Map<string, UserAccount>): void {
    this.store.clear();
    snap.forEach((value, key) => this.store.set(key, value));
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly store = new Map<string, Session>();
  failSave = false;
  failRevokeAll = false;
  failRevokeOtherSessions = false;
  failRotateIfDigestMatches = false;
  /** Quando true, simula corrida perdida: `rotateIfDigestMatches` retorna `Result.ok(null)`. */
  simulateLostRace = false;
  /** Espião: número de chamadas a `revokeAll()`, para provar orquestração no caso de uso. */
  revokeAllCallCount = 0;

  nextId(): string {
    return Id.createUUID();
  }

  async findById(sessionId: string, bancaId: string): Promise<Result<Session | null>> {
    const session = this.store.get(sessionId);
    if (!session || session.bancaId !== bancaId) {
      return Result.ok(null);
    }
    return Result.ok(session);
  }

  async findByDigest(digest: string): Promise<Result<Session | null>> {
    for (const session of this.store.values()) {
      if (session.refreshTokenDigest === digest) {
        return Result.ok(session);
      }
    }
    return Result.ok(null);
  }

  async findActiveByUser(userId: string, bancaId: string): Promise<Result<Session[]>> {
    const now = new Date();
    const list = [...this.store.values()].filter(
      (s) => s.userId === userId && s.bancaId === bancaId && !s.isRevoked() && !s.isExpired(now),
    );
    return Result.ok(list);
  }

  async save(session: Session): Promise<Result<void>> {
    if (this.failSave) {
      return Result.fail('SESSION_SAVE_ERROR');
    }
    this.store.set(session.id, session);
    return Result.ok();
  }

  async revokeAll(userId: string, bancaId: string, revokedAt: Date): Promise<Result<void>> {
    this.revokeAllCallCount += 1;
    if (this.failRevokeAll) {
      return Result.fail('SESSION_REVOKE_ALL_ERROR');
    }
    for (const session of this.store.values()) {
      if (session.userId === userId && session.bancaId === bancaId && !session.isRevoked()) {
        const revoked = session.revoke(revokedAt);
        if (revoked.isOk) {
          this.store.set(session.id, revoked.instance);
        }
      }
    }
    return Result.ok();
  }

  async revokeOtherSessions(
    userId: string,
    bancaId: string,
    currentSessionId: string,
    revokedAt: Date,
  ): Promise<Result<void>> {
    if (this.failRevokeOtherSessions) {
      return Result.fail('SESSION_REVOKE_OTHERS_ERROR');
    }
    for (const session of this.store.values()) {
      if (
        session.userId === userId &&
        session.bancaId === bancaId &&
        session.id !== currentSessionId &&
        !session.isRevoked()
      ) {
        const revoked = session.revoke(revokedAt);
        if (revoked.isOk) {
          this.store.set(session.id, revoked.instance);
        }
      }
    }
    return Result.ok();
  }

  async rotateIfDigestMatches(
    sessionId: string,
    oldDigest: string,
    newDigest: string,
    newExpiresAt: Date,
    now: Date,
  ): Promise<Result<Session | null>> {
    if (this.failRotateIfDigestMatches) {
      return Result.fail('SESSION_ROTATE_ERROR');
    }
    if (this.simulateLostRace) {
      return Result.ok(null);
    }
    const session = this.store.get(sessionId);
    if (!session || session.refreshTokenDigest !== oldDigest) {
      return Result.ok(null);
    }
    // Simula o predicado `revokedAt IS NULL AND expiresAt > now` do WHERE real.
    if (!session.isActive(now)) {
      return Result.ok(null);
    }
    const rotated = session.rotate(newDigest, newExpiresAt, now);
    if (rotated.isFailure) {
      return Result.ok(null);
    }
    this.store.set(session.id, rotated.instance);
    return Result.ok(rotated.instance);
  }

  snapshot(): Map<string, Session> {
    return new Map(this.store);
  }

  restore(snap: Map<string, Session>): void {
    this.store.clear();
    snap.forEach((value, key) => this.store.set(key, value));
  }
}

export class FakePasswordCrypto implements PasswordCryptoProvider {
  failHash = false;
  failCompare = false;
  /** Quando definido, `hash()` retorna esse valor em vez de `hashed:<plain>`. */
  hashOverride?: string;
  /** Espiões: provam que hash/compare NÃO ocorreram após uma negação anterior (ex.: de permissão). */
  hashCallCount = 0;
  compareCallCount = 0;

  async hash(plain: string): Promise<Result<string>> {
    this.hashCallCount += 1;
    if (this.failHash) {
      return Result.fail('PASSWORD_HASH_ERROR');
    }
    return Result.ok(this.hashOverride ?? `hashed:${plain}`);
  }
  async compare(plain: string, hash: string): Promise<Result<boolean>> {
    this.compareCallCount += 1;
    if (this.failCompare) {
      return Result.fail('PASSWORD_COMPARE_ERROR');
    }
    return Result.ok(hash === `hashed:${plain}`);
  }
}

export class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  private counter = 0;
  failGenerate = false;
  async generate(): Promise<Result<string>> {
    if (this.failGenerate) {
      return Result.fail('REFRESH_TOKEN_GENERATE_ERROR');
    }
    this.counter += 1;
    return Result.ok(`refresh-token-${this.counter}`);
  }
}

export class FakeRefreshTokenDigester implements RefreshTokenDigester {
  failDigest = false;
  /** Quando definido, `digest()` retorna esse valor em vez de `digest:<token>`. */
  digestOverride?: string;

  digest(token: string): Result<string> {
    if (this.failDigest) {
      return Result.fail('DIGEST_ERROR');
    }
    if (!token) {
      return Result.fail('EMPTY_TOKEN');
    }
    return Result.ok(this.digestOverride ?? `digest:${token}`);
  }
}

export class FakeAccessTokenIssuer implements AccessTokenIssuer {
  lastClaims?: AccessTokenClaims;
  failIssue = false;
  async issue(claims: AccessTokenClaims): Promise<Result<IssuedAccessToken>> {
    if (this.failIssue) {
      return Result.fail('ACCESS_TOKEN_ISSUE_ERROR');
    }
    this.lastClaims = claims;
    return Result.ok({
      token: `access:${JSON.stringify(claims)}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  }
}

export class FakeTemporaryPasswordGenerator implements TemporaryPasswordGenerator {
  failGenerate = false;
  private readonly queue: string[] = [];
  constructor(private readonly value = 'Temp@12345') {}

  /** Enfileira valores a serem retornados em chamadas sucessivas, antes de cair no `value` padrão. */
  enqueue(...values: string[]): void {
    this.queue.push(...values);
  }

  generate(): Result<string> {
    if (this.failGenerate) {
      return Result.fail('TEMP_PASSWORD_GENERATE_ERROR');
    }
    if (this.queue.length > 0) {
      return Result.ok(this.queue.shift()!);
    }
    return Result.ok(this.value);
  }
}

export class FakeBancaResolver implements BancaContextResolver {
  constructor(private readonly map: Record<string, BancaContext>) {}
  async resolve(codigoBanca: string): Promise<Result<BancaContext>> {
    const ctx = this.map[codigoBanca];
    if (!ctx) {
      return Result.fail('IDENTITY.BANCA_NOT_FOUND');
    }
    return Result.ok(ctx);
  }
}
