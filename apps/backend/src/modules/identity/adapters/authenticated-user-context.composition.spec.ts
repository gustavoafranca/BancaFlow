import { Test, TestingModule } from '@nestjs/testing';
import type { Result } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '@bancaflow/identity';
import type {
  AuthenticatedUserContextDto,
  GetAuthenticatedUserContextUseCase,
} from '@bancaflow/identity';
import { SharedModule } from '../../../shared/shared.module';
import { PrismaService } from '../../../db/prisma.service';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { IdentityModule } from '../identity.module';
import { GET_AUTHENTICATED_USER_CONTEXT_USE_CASE } from '../identity.tokens';

/**
 * Teste de integração da composição NestJS (4.6): resolve o
 * `GetAuthenticatedUserContextUseCase` REAL com seus adapters reais (query de
 * conta do Identity + resolver→use case→query de banca do Tenancy) e comprova
 * que a classificação de falhas é preservada na fronteira Identity–Tenancy.
 * O `PrismaService` é o único ponto substituído (fake), evitando dependência de
 * banco e permitindo injetar sucesso, ausência e falha técnica por origem.
 */
describe('GetAuthenticatedUserContext composition (integration)', () => {
  let moduleRef: TestingModule;
  let useCase: GetAuthenticatedUserContextUseCase;

  const userAccountFindFirst = jest.fn();
  const bancaFindFirst = jest.fn();
  let consoleError: jest.SpyInstance;

  const fakePrisma = {
    activeClient: () => ({
      userAccount: { findFirst: userAccountFindFirst },
      banca: { findFirst: bancaFindFirst },
    }),
  } as unknown as PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [SharedModule, IdentityModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();

    useCase = moduleRef.get<GetAuthenticatedUserContextUseCase>(
      GET_AUTHENTICATED_USER_CONTEXT_USE_CASE,
    );
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    userAccountFindFirst.mockReset();
    bancaFindFirst.mockReset();
    consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  const run = (): Promise<Result<AuthenticatedUserContextDto>> =>
    useCase.execute({
      userId: 'user-1',
      bancaId: 'banca-1',
      actorRole: 'OWNER',
    });

  it('sucesso: compõe conta (Identity) + banca (Tenancy) mapeando nome→name', async () => {
    userAccountFindFirst.mockResolvedValue({
      id: 'user-1',
      bancaId: 'banca-1',
      username: 'joao',
      name: 'João Silva',
      email: 'joao@banca.com',
      role: 'OWNER',
    });
    bancaFindFirst.mockResolvedValue({
      id: 'banca-1',
      codigoBanca: 'farizeu',
      nome: 'Banca São Jorge',
    });

    const result = await run();

    expect(result.isOk).toBe(true);
    expect(result.instance).toEqual({
      userId: 'user-1',
      username: 'joao',
      name: 'João Silva',
      email: 'joao@banca.com',
      role: 'OWNER',
      banca: {
        bancaId: 'banca-1',
        codigoBanca: 'farizeu',
        name: 'Banca São Jorge',
      },
    });
  });

  it('B: banca ausente/inativa (Tenancy → null) → INVALID_CREDENTIALS', async () => {
    userAccountFindFirst.mockResolvedValue({
      id: 'user-1',
      bancaId: 'banca-1',
      username: 'joao',
      name: 'João Silva',
      email: null,
      role: 'USER',
    });
    bancaFindFirst.mockResolvedValue(null);

    const result = await run();

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([IDENTITY_ERRORS.INVALID_CREDENTIALS]);
  });

  it('C: falha técnica de Identity é preservada até a borda (não vira INVALID_CREDENTIALS)', async () => {
    userAccountFindFirst.mockRejectedValue(new Error('boom-identity'));

    const result = await run();

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(
      TECHNICAL_ERROR_CODES.IDENTITY_USER_ACCOUNT_QUERY,
    );
    expect(result.errors).not.toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('C: falha técnica de Tenancy é preservada até a borda (não vira INVALID_CREDENTIALS)', async () => {
    userAccountFindFirst.mockResolvedValue({
      id: 'user-1',
      bancaId: 'banca-1',
      username: 'joao',
      name: 'João Silva',
      email: null,
      role: 'USER',
    });
    bancaFindFirst.mockRejectedValue(new Error('boom-tenancy'));

    const result = await run();

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(
      TECHNICAL_ERROR_CODES.TENANCY_BANCA_DISPLAY_QUERY,
    );
    expect(result.errors).not.toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });
});
