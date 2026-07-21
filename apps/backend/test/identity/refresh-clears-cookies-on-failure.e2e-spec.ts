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
const CODES = ['rc-farizeu'];

/**
 * e2e do bug reportado na revisão de `review-web-frontend-architecture`
 * (P1): quando `POST /api/auth/refresh` falha (sessão rotacionada, revogada
 * ou expirada), o access/refresh token antigo precisa ser LIMPO na mesma
 * resposta. Sem isso, o navegador continua enviando um access token stale
 * que `/login` (que só faz parse leve do JWT, sem consultar o backend)
 * trataria como "ainda autenticado" e redirecionaria de volta para
 * `/dashboard` — criando um loop entre `/login?expired=1` e `/dashboard`
 * quando o cliente detecta a sessão expirada e tenta o silent refresh.
 */
describe('Refresh failure clears auth cookies (e2e) — POST /api/auth/refresh', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previousSuffix: string | undefined;
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

  beforeAll(async () => {
    // Determinístico independente do `.env` local (dev usa `.localhost`),
    // mesmo padrão de `test/tenancy/tenant-context.e2e-spec.ts`.
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

    const banca = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: 'rc-farizeu',
        nome: 'Banca RC',
        status: 'ACTIVE',
      },
    });
    bancaIds['rc-farizeu'] = banca.id;

    const owner = await createAccount.execute({
      bancaId: banca.id,
      username: 'owner',
      name: 'Owner Silva',
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

  async function login() {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('rc-farizeu'))
      .send({ username: 'owner', password: PASSWORD });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return {
      status: res.status,
      sessionId: (res.body as { sessionId: string }).sessionId,
      accessCookie: cookieValue(setCookies, 'access_token'),
      refreshCookie: cookieValue(setCookies, 'refresh_token'),
    };
  }

  it('refresh com token já rotacionado (reuso) falha e limpa os cookies de auth', async () => {
    const first = await login();
    expect(first.status).toBe(200);

    // Primeira rotação: sucede e emite um novo par de cookies.
    const rotate = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Host', hostFor('rc-farizeu'))
      .set('Cookie', first.refreshCookie);
    expect(rotate.status).toBe(200);

    // Reusar o refresh JÁ ROTACIONADO falha — e a resposta de falha precisa
    // limpar os cookies antigos, não apenas devolver 401 com o cookie stale
    // intacto (o que permitiria ao `/login` tratá-lo como sessão válida).
    const reused = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Host', hostFor('rc-farizeu'))
      .set('Cookie', first.refreshCookie);
    expect(reused.status).toBe(401);

    const reusedCookies = reused.headers['set-cookie'] as unknown as string[];
    expect(reusedCookies).toBeDefined();
    const clearedAccess = reusedCookies.find((c) =>
      c.startsWith('access_token='),
    );
    const clearedRefresh = reusedCookies.find((c) =>
      c.startsWith('refresh_token='),
    );
    expect(clearedAccess).toBeDefined();
    expect(clearedRefresh).toBeDefined();
    expect(clearedAccess).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(clearedRefresh).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('refresh de sessão revogada falha e limpa os cookies de auth (evita loop login/dashboard)', async () => {
    const session = await login();
    expect(session.status).toBe(200);

    await prisma.client.session.update({
      where: { id: session.sessionId },
      data: { revokedAt: new Date() },
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Host', hostFor('rc-farizeu'))
      .set('Cookie', session.refreshCookie);
    expect(res.status).toBe(401);

    const setCookies = res.headers['set-cookie'] as unknown as string[];
    expect(setCookies).toBeDefined();
    expect(setCookies.find((c) => c.startsWith('access_token='))).toMatch(
      /Expires=Thu, 01 Jan 1970/,
    );
    expect(setCookies.find((c) => c.startsWith('refresh_token='))).toMatch(
      /Expires=Thu, 01 Jan 1970/,
    );
  });
});
