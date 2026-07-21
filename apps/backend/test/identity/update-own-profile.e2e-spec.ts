import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../../src/app.module';
import { ApiExceptionFilter } from './../../src/shared/errors/api-exception.filter';
import { PrismaService } from './../../src/db/prisma.service';
import { CREATE_USER_ACCOUNT_USE_CASE } from './../../src/modules/identity/identity.tokens';
import type { CreateUserAccountUseCase } from '@bancaflow/identity';

const PASSWORD = 'OwnerPass@123';
const CODIGO_BANCA = 'update-profile-banca';
const NOME_BANCA = 'Banca Update Profile';

/**
 * e2e de `PATCH /api/auth/me`: sucesso (nome/e-mail/ambos/limpeza), não
 * autenticado, dados inválidos, corpo só com `version`, conflito de versão
 * (leitura desatualizada e CAS na escrita), payload sem autoridade sobre
 * `userId`/`bancaId`, resposta mínima sem entidade/projeção.
 */
describe('Self profile management (e2e) — PATCH /api/auth/me', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bancaId: string;

  async function cleanup(): Promise<void> {
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: CODIGO_BANCA } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: CODIGO_BANCA } },
    });
    await prisma.client.banca.deleteMany({
      where: { codigoBanca: CODIGO_BANCA },
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

    await cleanup();

    const banca = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: CODIGO_BANCA,
        nome: NOME_BANCA,
        status: 'ACTIVE',
      },
    });
    bancaId = banca.id;
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

  const HOST = `${CODIGO_BANCA}.bancaflow.com.br`;

  function cookieValue(setCookies: string[], name: string): string {
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) throw new Error(`cookie ${name} não encontrado`);
    return found.split(';')[0];
  }

  async function createAndLogin(
    username: string,
    name: string,
    email?: string,
  ) {
    const createAccount = app.get<CreateUserAccountUseCase>(
      CREATE_USER_ACCOUNT_USE_CASE,
    );
    const created = await createAccount.execute({
      bancaId,
      username,
      name,
      email,
      password: PASSWORD,
      role: 'USER',
    });
    if (created.isFailure) {
      throw new Error(`seed ${username} failed: ${created.errors?.join(',')}`);
    }

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', HOST)
      .send({ username, password: PASSWORD });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return {
      userId: (res.body as { userId: string }).userId,
      accessCookie: cookieValue(setCookies, 'access_token'),
    };
  }

  async function getMe(accessCookie: string) {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', HOST)
      .set('Cookie', accessCookie);
    return res.body as {
      userId: string;
      name: string;
      email: string | null;
      version: number;
    };
  }

  function patchMe(accessCookie: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Host', HOST)
      .set('Cookie', accessCookie)
      .send(body);
  }

  it('atualiza nome e e-mail com sucesso e retorna 200 { success: true } (confirmação mínima)', async () => {
    const user = await createAndLogin(
      'update-both',
      'Nome Original',
      'original@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      name: 'Nome Novo',
      email: 'novo@example.com',
      version: before.version,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const after = await getMe(user.accessCookie);
    expect(after.name).toBe('Nome Novo');
    expect(after.email).toBe('novo@example.com');
    expect(after.version).toBe(before.version + 1);
  });

  it('atualiza somente o nome, preservando o e-mail', async () => {
    const user = await createAndLogin(
      'update-name-only',
      'Nome Original',
      'preservado@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      name: 'Somente Nome',
      version: before.version,
    });
    expect(res.status).toBe(200);

    const after = await getMe(user.accessCookie);
    expect(after.name).toBe('Somente Nome');
    expect(after.email).toBe('preservado@example.com');
  });

  it('limpa o e-mail quando enviado como null', async () => {
    const user = await createAndLogin(
      'update-clear-email',
      'Nome Clear',
      'clear@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      email: null,
      version: before.version,
    });
    expect(res.status).toBe(200);

    const after = await getMe(user.accessCookie);
    expect(after.email).toBeNull();
  });

  it('sem cookie de sessão retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Host', HOST)
      .send({ name: 'Alguem', version: 1 });
    expect(res.status).toBe(401);
  });

  it('nome inválido é rejeitado sem persistir', async () => {
    const user = await createAndLogin(
      'update-invalid-name',
      'Nome Valido',
      'ok@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      name: 'X',
      version: before.version,
    });
    expect(res.status).toBe(400);

    const after = await getMe(user.accessCookie);
    expect(after.name).toBe('Nome Valido');
    expect(after.version).toBe(before.version);
  });

  it('corpo só com version é rejeitado (400), sem incrementar a versão persistida', async () => {
    const user = await createAndLogin(
      'update-version-only',
      'Nome Version',
      'version@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, { version: before.version });
    expect(res.status).toBe(400);

    const after = await getMe(user.accessCookie);
    expect(after.version).toBe(before.version);
  });

  it('version desatualizado retorna 409 IDENTITY.CONCURRENCY_CONFLICT sem persistir', async () => {
    const user = await createAndLogin(
      'update-stale-version',
      'Nome Stale',
      'stale@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      name: 'Tentativa Desatualizada',
      version: before.version - 1,
    });
    expect(res.status).toBe(409);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.CONCURRENCY_CONFLICT',
    ]);

    const after = await getMe(user.accessCookie);
    expect(after.name).toBe('Nome Stale');
    expect(after.version).toBe(before.version);
  });

  /**
   * Smoke test de corrida via HTTP: dispara duas requisições concorrentes e
   * comprova o resultado observável (uma 200, uma 409, uma única escrita
   * persistida) sem assumir qual das duas janelas de proteção (comparação
   * antecipada do caso de uso vs. `updateMany` do adapter Prisma) intercepta
   * o perdedor — o `Promise.all` não garante que ambas leiam antes de A
   * escrever. A prova determinística de que o `updateMany` do Prisma em si
   * retorna `IDENTITY_ERRORS.CONCURRENCY_CONFLICT` quando `count === 0` está
   * em `user-account.repository.prisma.spec.ts` (mock do cliente Prisma,
   * sem depender de timing).
   */
  it('conflito de CAS na escrita (corrida entre duas requisições com o mesmo version) retorna 409 em uma delas, sem persistir', async () => {
    const user = await createAndLogin(
      'update-write-race',
      'Nome Race',
      'race@example.com',
    );
    const before = await getMe(user.accessCookie);

    const [resA, resB] = await Promise.all([
      patchMe(user.accessCookie, {
        name: 'Nome Vencedor',
        version: before.version,
      }),
      patchMe(user.accessCookie, {
        name: 'Nome Perdedor',
        version: before.version,
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const after = await getMe(user.accessCookie);
    expect(after.version).toBe(before.version + 1);
  });

  it('payload tentando definir userId/bancaId é ignorado (identidade só do AuthContext)', async () => {
    const user = await createAndLogin(
      'update-no-authority',
      'Nome Auth',
      'auth@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      name: 'Nome Autorizado',
      version: before.version,
      userId: 'outro-usuario',
      bancaId: 'outra-banca',
    });
    // `userId`/`bancaId` não fazem parte do DTO — corpo com campos desconhecidos é rejeitado pelo whitelist global.
    expect(res.status).toBe(400);

    const after = await getMe(user.accessCookie);
    expect(after.name).toBe('Nome Auth');
  });

  it('resposta de sucesso não serializa entidade nem row Prisma', async () => {
    const user = await createAndLogin(
      'update-minimal-response',
      'Nome Minimal',
      'minimal@example.com',
    );
    const before = await getMe(user.accessCookie);

    const res = await patchMe(user.accessCookie, {
      name: 'Nome Segundo',
      version: before.version,
    });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body as object).sort()).toEqual(['success']);
  });
});
