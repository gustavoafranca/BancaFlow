import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Result } from '@bancaflow/shared';
import type {
  AuthenticatedUserAccountDto,
  AuthenticatedUserAccountQuery,
  CreateUserAccountUseCase,
} from '@bancaflow/identity';
import type {
  BancaDisplayContextQuery,
  BancaDisplayContextView,
} from '@bancaflow/tenancy';
import { AppModule } from './../../src/app.module';
import { ApiExceptionFilter } from './../../src/shared/errors/api-exception.filter';
import { PrismaService } from './../../src/db/prisma.service';
import {
  AUTHENTICATED_USER_ACCOUNT_QUERY,
  CREATE_USER_ACCOUNT_USE_CASE,
} from './../../src/modules/identity/identity.tokens';
import { BANCA_DISPLAY_CONTEXT_QUERY } from './../../src/modules/tenancy/tenancy.module';
import {
  TECHNICAL_ERROR_CODES,
  safeErrorCode,
} from './../../src/shared/errors';

const PASSWORD = 'OwnerPass@123';
const CODE = 'me-fail';

/**
 * Fakes CONFIGURÁVEIS das queries de leitura, sobrepostos apenas no caminho de
 * `GET /api/auth/me` (o guard continua usando repositories reais). Permitem
 * simular, de forma determinística e após a aprovação do guard:
 *  - corrida pós-guard (categoria B → `401 INVALID_CREDENTIALS`);
 *  - falha técnica de Identity/Tenancy (categoria C → `500` genérico).
 */
class ConfigurableAccountQuery implements AuthenticatedUserAccountQuery {
  impl: (
    userId: string,
    bancaId: string,
  ) => Promise<Result<AuthenticatedUserAccountDto | null>> = (
    userId,
    bancaId,
  ) =>
    Promise.resolve(
      Result.ok({
        userId,
        bancaId,
        username: 'owner',
        name: 'Owner Silva',
        email: 'owner@banca.com',
        role: 'OWNER',
        version: 1,
      }),
    );
  findByUserAndBanca(userId: string, bancaId: string) {
    return this.impl(userId, bancaId);
  }
}

class ConfigurableBancaQuery implements BancaDisplayContextQuery {
  impl: (bancaId: string) => Promise<Result<BancaDisplayContextView | null>> = (
    bancaId,
  ) =>
    Promise.resolve(
      Result.ok({ bancaId, codigoBanca: CODE, nome: 'Banca Fail' }),
    );
  findActiveById(bancaId: string) {
    return this.impl(bancaId);
  }
}

describe('Authenticated user context failures (e2e) — post-guard & technical', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bancaId: string;
  const accountQuery = new ConfigurableAccountQuery();
  const bancaQuery = new ConfigurableBancaQuery();

  async function cleanup(): Promise<void> {
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: CODE } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: CODE } },
    });
    await prisma.client.banca.deleteMany({ where: { codigoBanca: CODE } });
  }

  let previousSuffix: string | undefined;
  beforeAll(async () => {
    // Determinístico independente do `.env` local (que em dev usa
    // `.localhost`, ver `apps/backend/.env`): mesmo padrão de override de
    // `test/tenancy/tenant-context.e2e-spec.ts`.
    previousSuffix = process.env.BANCA_HOST_SUFFIX;
    process.env.BANCA_HOST_SUFFIX = '.bancaflow.com.br';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTHENTICATED_USER_ACCOUNT_QUERY)
      .useValue(accountQuery)
      .overrideProvider(BANCA_DISPLAY_CONTEXT_QUERY)
      .useValue(bancaQuery)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const createAccount = app.get<CreateUserAccountUseCase>(
      CREATE_USER_ACCOUNT_USE_CASE,
    );

    await cleanup();
    const banca = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: CODE,
        nome: 'Banca Fail',
        status: 'ACTIVE',
      },
    });
    bancaId = banca.id;
    const owner = await createAccount.execute({
      bancaId,
      username: 'owner',
      name: 'Owner Silva',
      email: 'owner@banca.com',
      password: PASSWORD,
      role: 'OWNER',
    });
    if (owner.isFailure) {
      throw new Error(`seed owner failed: ${owner.errors?.join(',')}`);
    }
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    if (previousSuffix === undefined) {
      delete process.env.BANCA_HOST_SUFFIX;
    } else {
      process.env.BANCA_HOST_SUFFIX = previousSuffix;
    }
  });

  const hostFor = (codigo: string) => `${codigo}.bancaflow.com.br`;

  function cookieValue(setCookies: string[], name: string): string {
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) throw new Error(`cookie ${name} não encontrado`);
    return found.split(';')[0];
  }

  async function loginOwner(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(CODE))
      .send({ username: 'owner', password: PASSWORD });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return cookieValue(setCookies, 'access_token');
  }

  const me = (cookie: string) =>
    request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor(CODE))
      .set('Cookie', cookie);

  beforeEach(() => {
    // Restaura o comportamento de sucesso padrão entre testes.
    accountQuery.impl = (userId, bId) =>
      Promise.resolve(
        Result.ok({
          userId,
          bancaId: bId,
          username: 'owner',
          name: 'Owner Silva',
          email: 'owner@banca.com',
          role: 'OWNER',
          version: 1,
        }),
      );
    bancaQuery.impl = (bId) =>
      Promise.resolve(
        Result.ok({ bancaId: bId, codigoBanca: CODE, nome: 'Banca Fail' }),
      );
  });

  // --- 6.5: corrida pós-guard → 401 INVALID_CREDENTIALS sem contexto parcial ---

  it('B: conta some entre guard e query → 401 INVALID_CREDENTIALS sem contexto parcial', async () => {
    const cookie = await loginOwner();
    accountQuery.impl = () => Promise.resolve(Result.ok(null)); // conta desaparece pós-guard
    const res = await me(cookie);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.INVALID_CREDENTIALS',
    ]);
    // Sem contexto parcial: nenhum dado de conta/banca vaza.
    const body = res.body as Record<string, unknown>;
    expect(body.userId).toBeUndefined();
    expect(body.banca).toBeUndefined();
  });

  it('B: banca some entre guard e query → 401 INVALID_CREDENTIALS sem contexto parcial', async () => {
    const cookie = await loginOwner();
    bancaQuery.impl = () => Promise.resolve(Result.ok(null)); // banca desaparece pós-guard
    const res = await me(cookie);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.INVALID_CREDENTIALS',
    ]);
    const body = res.body as Record<string, unknown>;
    expect(body.userId).toBeUndefined();
    expect(body.banca).toBeUndefined();
  });

  // --- 6.7 / 6.8: falha técnica → 500 genérico simétrico, sem vazamento ---

  const GENERIC_500 = ['An unexpected error occurred. Please try again later.'];

  function assertGenericInternalError(body: Record<string, unknown>) {
    expect(body.statusCode).toBe(500);
    expect(body.message).toEqual(GENERIC_500);
    // Nenhum código interno, detalhe técnico, stack ou detalhe Prisma vaza.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('USER_ACCOUNT_QUERY_ERROR');
    expect(serialized).not.toContain('BANCA_DISPLAY_QUERY_ERROR');
    expect(serialized).not.toContain('ECONNREFUSED');
    expect(serialized).not.toContain('Prisma');
    expect(body.code).toBeUndefined();
    expect(body.stack).toBeUndefined();
  }

  it('C: falha técnica de Identity → 500 genérico; causa só em log interno (6.7/6.8)', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const cause = new Error('connection refused (ECONNREFUSED)');
    accountQuery.impl = () =>
      Promise.resolve(
        Result.fail(
          safeErrorCode(
            cause,
            TECHNICAL_ERROR_CODES.IDENTITY_USER_ACCOUNT_QUERY,
          ),
        ),
      );

    const cookie = await loginOwner();
    const res = await me(cookie);

    expect(res.status).toBe(500);
    assertGenericInternalError(res.body as Record<string, unknown>);
    // 6.8: a causa/contexto permanece disponível ao logging interno seguro,
    // como log ESTRUTURADO e SANITIZADO (código técnico), sem a mensagem bruta.
    const logged = String(consoleError.mock.calls[0]?.[0]);
    expect(logged).toContain(TECHNICAL_ERROR_CODES.IDENTITY_USER_ACCOUNT_QUERY);
    expect(logged).not.toContain('ECONNREFUSED');
    consoleError.mockRestore();
  });

  it('C: falha técnica de Tenancy → 500 genérico, com o MESMO contrato externo (simétrico)', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const cause = new Error('pool timeout');
    bancaQuery.impl = () =>
      Promise.resolve(
        Result.fail(
          safeErrorCode(
            cause,
            TECHNICAL_ERROR_CODES.TENANCY_BANCA_DISPLAY_QUERY,
          ),
        ),
      );

    const cookie = await loginOwner();
    const res = await me(cookie);

    expect(res.status).toBe(500);
    assertGenericInternalError(res.body as Record<string, unknown>);
    const logged = String(consoleError.mock.calls[0]?.[0]);
    expect(logged).toContain(TECHNICAL_ERROR_CODES.TENANCY_BANCA_DISPLAY_QUERY);
    expect(logged).not.toContain('pool timeout');
    consoleError.mockRestore();
  });
});
