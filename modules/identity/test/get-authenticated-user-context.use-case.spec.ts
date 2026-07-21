import { Result } from '@bancaflow/shared';
import { DenyAllPermissionChecker, RealPermissionChecker } from './support/fakes';
import type { PermissionChecker } from '../src/shared/ports/permission-checker.port';
import { GetAuthenticatedUserContextUseCase } from '../src/app/use-case/get-authenticated-user-context.use-case';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import type { AuthenticatedUserAccountDto } from '../src/shared/dto/authenticated-user-context.dto';
import type { AuthenticatedUserAccountQuery } from '../src/shared/ports/authenticated-user-account.query';
import type {
  BancaDisplayContext,
  BancaDisplayContextResolver,
} from '../src/shared/ports/banca-display-context-resolver.port';

// Códigos técnicos (categoria C) simulados nos fakes. No backend real vêm de
// `TECHNICAL_ERROR_CODES`; aqui basta um código distinto de INVALID_CREDENTIALS.
const IDENTITY_TECHNICAL = 'IDENTITY.USER_ACCOUNT_QUERY_ERROR';
const TENANCY_TECHNICAL = 'TENANCY.BANCA_DISPLAY_QUERY_ERROR';

class FakeAccountQuery implements AuthenticatedUserAccountQuery {
  lastArgs?: { userId: string; bancaId: string };
  constructor(private readonly result: Result<AuthenticatedUserAccountDto | null>) {}
  async findByUserAndBanca(userId: string, bancaId: string) {
    this.lastArgs = { userId, bancaId };
    return this.result;
  }
}

class FakeBancaDisplayResolver implements BancaDisplayContextResolver {
  lastBancaId?: string;
  constructor(private readonly result: Result<BancaDisplayContext | null>) {}
  async resolve(bancaId: string) {
    this.lastBancaId = bancaId;
    return this.result;
  }
}

const account = (over: Partial<AuthenticatedUserAccountDto> = {}): AuthenticatedUserAccountDto => ({
  userId: 'user-1',
  bancaId: 'banca-1',
  username: 'joao',
  name: 'João Silva',
  email: 'joao@banca.com',
  role: 'ADMIN',
  version: 1,
  ...over,
});

const bancaCtx = (over: Partial<BancaDisplayContext> = {}): BancaDisplayContext => ({
  bancaId: 'banca-1',
  codigoBanca: 'farizeu',
  name: 'Banca São Jorge',
  ...over,
});

function build(
  accountResult: Result<AuthenticatedUserAccountDto | null>,
  bancaResult: Result<BancaDisplayContext | null>,
  permissions: PermissionChecker = new RealPermissionChecker(),
) {
  const accounts = new FakeAccountQuery(accountResult);
  const banca = new FakeBancaDisplayResolver(bancaResult);
  return {
    accounts,
    banca,
    useCase: new GetAuthenticatedUserContextUseCase(accounts, banca, permissions),
  };
}

describe('GetAuthenticatedUserContextUseCase', () => {
  it('retorna o contexto de exibição do próprio usuário e banca', async () => {
    const { useCase, accounts, banca } = build(Result.ok(account()), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });

    expect(result.isOk).toBe(true);
    expect(result.instance).toEqual({
      userId: 'user-1',
      username: 'joao',
      name: 'João Silva',
      email: 'joao@banca.com',
      role: 'ADMIN',
      version: 1,
      banca: { bancaId: 'banca-1', codigoBanca: 'farizeu', name: 'Banca São Jorge' },
    });
    // Identificação vem apenas dos argumentos do contexto autenticado.
    expect(accounts.lastArgs).toEqual({ userId: 'user-1', bancaId: 'banca-1' });
    expect(banca.lastBancaId).toBe('banca-1');
  });

  it('autoriza os três papéis via hasPermission (identity.profile.read-own é concedida a OWNER/ADMIN/USER)', async () => {
    for (const actorRole of ['OWNER', 'ADMIN', 'USER'] as const) {
      const { useCase } = build(Result.ok(account()), Result.ok(bancaCtx()));
      const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole });
      expect(result.isOk).toBe(true);
    }
  });

  it('nega via hasPermission (identity.profile.read-own) sem consultar conta/banca quando a permissão é negada', async () => {
    const permissions = new DenyAllPermissionChecker();
    const { useCase, accounts, banca } = build(Result.ok(account()), Result.ok(bancaCtx()), permissions);
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'USER' });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([IDENTITY_ERRORS.FORBIDDEN]);
    expect(permissions.lastArgs).toEqual({ actorRole: 'USER', permissionKey: 'identity.profile.read-own' });
    // Nenhum efeito colateral: nem a query de conta nem o resolver de banca são consultados.
    expect(accounts.lastArgs).toBeUndefined();
    expect(banca.lastBancaId).toBeUndefined();
  });

  it('representa e-mail ausente como null', async () => {
    const { useCase } = build(Result.ok(account({ email: null })), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isOk).toBe(true);
    expect(result.instance.email).toBeNull();
  });

  it('reflete o role persistido da projeção', async () => {
    const { useCase } = build(Result.ok(account({ role: 'OWNER' })), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.instance.role).toBe('OWNER');
  });

  it('reflete o version persistido da projeção', async () => {
    const { useCase } = build(Result.ok(account({ version: 7 })), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.instance.version).toBe(7);
  });

  it('não expõe campos além do contrato (sem isActive/status/entidade)', async () => {
    const { useCase } = build(Result.ok(account()), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(Object.keys(result.instance).sort()).toEqual(
      ['banca', 'email', 'name', 'role', 'userId', 'username', 'version'].sort(),
    );
    expect(Object.keys(result.instance.banca).sort()).toEqual(
      ['bancaId', 'codigoBanca', 'name'].sort(),
    );
  });

  // --- Categoria B: inconsistência esperada pós-guard → INVALID_CREDENTIALS ---

  it('B: falha genérica quando a conta não existe para o par userId+bancaId', async () => {
    const { useCase } = build(Result.ok(null), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([IDENTITY_ERRORS.INVALID_CREDENTIALS]);
  });

  it('B: falha genérica quando a conta pertence a outra banca (sem cross-tenant)', async () => {
    const { useCase, banca } = build(
      Result.ok(account({ bancaId: 'outra-banca' })),
      Result.ok(bancaCtx()),
    );
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([IDENTITY_ERRORS.INVALID_CREDENTIALS]);
    // Curto-circuito: não chega a resolver a banca quando a conta já diverge.
    expect(banca.lastBancaId).toBeUndefined();
  });

  it('B: falha genérica quando a banca está ausente/inativa (resolver → null)', async () => {
    const { useCase } = build(Result.ok(account()), Result.ok(null));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([IDENTITY_ERRORS.INVALID_CREDENTIALS]);
  });

  it('B: falha genérica quando o contexto da banca resolve outro bancaId', async () => {
    const { useCase } = build(Result.ok(account()), Result.ok(bancaCtx({ bancaId: 'outra-banca' })));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([IDENTITY_ERRORS.INVALID_CREDENTIALS]);
  });

  // --- Categoria C: falha técnica preservada (NÃO vira INVALID_CREDENTIALS) ---

  it('C: propaga falha técnica da query de conta (Identity), distinta de INVALID_CREDENTIALS', async () => {
    const { useCase } = build(Result.fail(IDENTITY_TECHNICAL), Result.ok(bancaCtx()));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_TECHNICAL);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('C: propaga falha técnica do resolver de banca (Tenancy), distinta de INVALID_CREDENTIALS', async () => {
    const { useCase } = build(Result.ok(account()), Result.fail(TENANCY_TECHNICAL));
    const result = await useCase.execute({ userId: 'user-1', bancaId: 'banca-1', actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_TECHNICAL);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });
});
