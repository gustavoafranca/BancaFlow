import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { CreateUserAccountUseCase } from '@bancaflow/identity';
import { AppModule } from './../../src/app.module';
import { ApiExceptionFilter } from './../../src/shared/errors/api-exception.filter';
import { PrismaService } from './../../src/db/prisma.service';
import { CREATE_USER_ACCOUNT_USE_CASE } from './../../src/modules/identity/identity.tokens';

const PASSWORD = 'OwnerPass@123';
const CODES = ['test-conc-login', 'test-conc-refresh'];

/**
 * Testes de concorrência real contra o banco (Promise.all — múltiplas
 * conexões concorrentes de fato, não fakes síncronos em JS single-thread).
 *
 * **Correção pós-review (P1-3 → decisão 4a revisada):** o incremento de falha
 * de login deixou de usar CAS otimista por `version` (que perdia incrementos
 * sob corrida real) e passou a usar lock pessimista (`SELECT ... FOR UPDATE`)
 * em `UserAccountRepositoryPrisma.recordLoginFailureAtomic`, dentro de uma
 * transação própria por tentativa. Isso serializa as 5 tentativas
 * concorrentes contra a MESMA linha — nenhuma se perde. O critério da spec é
 * **exato**: `failedLoginAttempts === 5` (não uma faixa), e a conta deve
 * ficar bloqueada (`lockedUntil` no futuro).
 */
describe('Identity — concorrência (integration, real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const bancaIds: Record<string, string> = {};

  async function cleanup(): Promise<void> {
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: { in: CODES } } },
    });
    await prisma.client.banca.deleteMany({
      where: { codigoBanca: { in: CODES } },
    });
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
    }).compile();

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

    for (const codigo of CODES) {
      const banca = await prisma.client.banca.create({
        data: {
          id: randomUUID(),
          codigoBanca: codigo,
          nome: codigo,
          status: 'ACTIVE',
        },
      });
      bancaIds[codigo] = banca.id;
      const created = await createAccount.execute({
        bancaId: banca.id,
        username: 'owner',
        name: 'Owner Silva',
        password: PASSWORD,
        role: 'OWNER',
      });
      if (created.isFailure) {
        throw new Error(`seed falhou: ${created.errors?.join(',')}`);
      }
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
    return setCookies.find((c) => c.startsWith(`${name}=`))!.split(';')[0];
  }

  it('cinco logins incorretos simultâneos: failedLoginAttempts === 5 (exato) e a conta fica bloqueada', async () => {
    const codigo = 'test-conc-login';

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/auth/login')
          .set('Host', hostFor(codigo))
          .send({ username: 'owner', password: 'senha-errada' }),
      ),
    );
    // Nenhuma requisição concorrente deve gerar 500 ou qualquer coisa que não
    // seja o 401 genérico — mesmo sob 5 tentativas verdadeiramente simultâneas.
    expect(results.every((r) => r.status === 401)).toBe(true);

    const afterBurst = await prisma.client.userAccount.findFirst({
      where: { bancaId: bancaIds[codigo] },
    });
    // Lock pessimista (SELECT ... FOR UPDATE) serializa as 5 tentativas
    // concorrentes contra a MESMA linha: nenhum incremento se perde.
    // Asserção EXATA (não faixa) — critério da spec.
    expect(afterBurst!.failedLoginAttempts).toBe(5);
    expect(afterBurst!.lockedUntil).not.toBeNull();
    expect(afterBurst!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // A conta permanece bloqueada mesmo com a senha correta.
    const locked = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(codigo))
      .send({ username: 'owner', password: PASSWORD });
    expect(locked.status).toBe(401);
  });

  it('dois refreshes concorrentes com o MESMO refresh token: exatamente um sucede', async () => {
    const codigo = 'test-conc-refresh';

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(codigo))
      .send({ username: 'owner', password: PASSWORD });
    expect(login.status).toBe(200);
    const refreshCookie = cookieValue(
      login.headers['set-cookie'] as unknown as string[],
      'refresh_token',
    );

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Host', hostFor(codigo))
        .set('Cookie', refreshCookie),
      request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Host', hostFor(codigo))
        .set('Cookie', refreshCookie),
    ]);

    const statuses = [first.status, second.status].sort();
    // O compare-and-swap (`rotateIfDigestMatches`) garante exatamente um
    // vencedor: a comparação do digest é avaliada no banco no momento do
    // UPDATE, contra o valor então corrente — não depende de leitura prévia.
    expect(statuses).toEqual([200, 401]);
  });
});
