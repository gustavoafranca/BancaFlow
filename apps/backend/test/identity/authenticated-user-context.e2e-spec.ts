import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
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
// `me-guard`/`me-guard2` são bancas dedicadas aos cenários de código do guard
// (sessão/estado/banca), isolando operações destrutivas das demais bancas.
const CODES = ['me-farizeu', 'me-botafogo', 'me-guard', 'me-guard2'];
const NOMES: Record<string, string> = {
  'me-farizeu': 'Banca São Jorge',
  'me-botafogo': 'Banca Botafogo',
  'me-guard': 'Banca Guard',
  'me-guard2': 'Banca Guard 2',
};

/**
 * e2e de `GET /api/auth/me`: contrato exato, dados persistidos atuais, e-mail
 * nulo, isolamento por banca, ausência de autoridade do cliente, bloqueio por
 * troca obrigatória e ausência de campos internos/entidades.
 */
describe('Authenticated user context (e2e) — GET /api/auth/me', () => {
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
          nome: NOMES[codigo],
          status: 'ACTIVE',
        },
      });
      bancaIds[codigo] = banca.id;

      const owner = await createAccount.execute({
        bancaId: banca.id,
        username: 'owner',
        name: 'Owner Silva',
        email: 'owner@banca.com',
        password: PASSWORD,
        role: 'OWNER',
      });
      if (owner.isFailure) {
        throw new Error(`seed owner failed: ${owner.errors?.join(',')}`);
      }
    }

    // Conta sem e-mail (para o caso email: null).
    const noEmail = await createAccount.execute({
      bancaId: bancaIds['me-farizeu'],
      username: 'noemail',
      name: 'Sem Email',
      password: PASSWORD,
      role: 'USER',
    });
    if (noEmail.isFailure) {
      throw new Error(`seed noemail failed: ${noEmail.errors?.join(',')}`);
    }

    // Conta com troca obrigatória pendente.
    const mustChange = await createAccount.execute({
      bancaId: bancaIds['me-farizeu'],
      username: 'mustchange',
      name: 'Deve Trocar',
      password: PASSWORD,
      role: 'USER',
      mustChangePassword: true,
    });
    if (mustChange.isFailure) {
      throw new Error(
        `seed mustchange failed: ${mustChange.errors?.join(',')}`,
      );
    }

    // Contas dedicadas aos cenários de código do guard / role persistida.
    const guardUsers: Array<{ username: string; codigo: string }> = [
      { username: 'roleshift', codigo: 'me-guard' },
      { username: 'blockme', codigo: 'me-guard' },
      { username: 'deactme', codigo: 'me-guard' },
    ];
    for (const u of guardUsers) {
      const created = await createAccount.execute({
        bancaId: bancaIds[u.codigo],
        username: u.username,
        name: `Guard ${u.username}`,
        email: `${u.username}@banca.com`,
        password: PASSWORD,
        role: 'USER',
      });
      if (created.isFailure) {
        throw new Error(
          `seed ${u.username} failed: ${created.errors?.join(',')}`,
        );
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
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) throw new Error(`cookie ${name} não encontrado`);
    return found.split(';')[0];
  }

  async function login(codigo: string, username: string, password = PASSWORD) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(codigo))
      .send({ username, password });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return {
      status: res.status,
      body: res.body as {
        userId: string;
        bancaId: string;
        sessionId: string;
        role: string;
        mustChangePassword: boolean;
      },
      accessCookie: setCookies
        ? cookieValue(setCookies, 'access_token')
        : undefined,
      refreshCookie: setCookies
        ? cookieValue(setCookies, 'refresh_token')
        : undefined,
    };
  }

  const meWith = (codigo: string, accessCookie: string) =>
    request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor(codigo))
      .set('Cookie', accessCookie);

  it('retorna o contrato exato do próprio usuário e banca', async () => {
    const owner = await login('me-farizeu', 'owner');
    expect(owner.status).toBe(200);

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', owner.accessCookie!);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toEqual({
      userId: owner.body.userId,
      username: 'owner',
      name: 'Owner Silva',
      email: 'owner@banca.com',
      role: 'OWNER',
      // version: 1 na criação, 2 após o login (que salva resetLoginFailures).
      version: 2,
      banca: {
        bancaId: bancaIds['me-farizeu'],
        codigoBanca: 'me-farizeu',
        name: 'Banca São Jorge',
      },
    });
  });

  it('representa e-mail ausente como null', async () => {
    const noEmail = await login('me-farizeu', 'noemail');
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', noEmail.accessCookie!);
    expect(res.status).toBe(200);
    expect((res.body as { email: unknown }).email).toBeNull();
    expect((res.body as { role: string }).role).toBe('USER');
  });

  it('não expõe isActive/status/credential nem campos internos (mas expõe version)', async () => {
    const owner = await login('me-farizeu', 'owner');
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', owner.accessCookie!);
    const body = res.body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      [
        'banca',
        'email',
        'name',
        'role',
        'userId',
        'username',
        'version',
      ].sort(),
    );
    expect(typeof body.version).toBe('number');
    for (const forbidden of [
      'isActive',
      'status',
      'passwordHash',
      'credential',
      'mustChangePassword',
      'failedLoginAttempts',
    ]) {
      expect(body[forbidden]).toBeUndefined();
    }
    expect(Object.keys(body.banca as object).sort()).toEqual(
      ['bancaId', 'codigoBanca', 'name'].sort(),
    );
  });

  it('sem cookie de sessão retorna 401 genérico', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'));
    expect(res.status).toBe(401);
  });

  it('identificadores enviados pelo cliente não têm autoridade', async () => {
    const owner = await login('me-farizeu', 'owner');
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .query({
        userId: 'outro-usuario',
        bancaId: bancaIds['me-botafogo'],
        codigoBanca: 'me-botafogo',
      })
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', owner.accessCookie!);
    expect(res.status).toBe(200);
    const body = res.body as { userId: string; banca: { bancaId: string } };
    // Resolvido só pelo AuthContext do cookie — ignora o que o cliente enviou.
    expect(body.userId).toBe(owner.body.userId);
    expect(body.banca.bancaId).toBe(bancaIds['me-farizeu']);
  });

  it('isola por banca: o contexto é sempre da banca do usuário autenticado', async () => {
    const ownerA = await login('me-farizeu', 'owner');
    const ownerB = await login('me-botafogo', 'owner');

    const resA = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', ownerA.accessCookie!);
    const resB = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-botafogo'))
      .set('Cookie', ownerB.accessCookie!);

    expect((resA.body as { banca: { bancaId: string } }).banca.bancaId).toBe(
      bancaIds['me-farizeu'],
    );
    expect((resB.body as { banca: { bancaId: string } }).banca.bancaId).toBe(
      bancaIds['me-botafogo'],
    );
    expect(
      (resA.body as { banca: { bancaId: string } }).banca.bancaId,
    ).not.toBe((resB.body as { banca: { bancaId: string } }).banca.bancaId);
  });

  it('mustChangePassword=true é bloqueado (403), sem @AllowPasswordChange', async () => {
    const mustChange = await login('me-farizeu', 'mustchange');
    expect(mustChange.status).toBe(200);
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', mustChange.accessCookie!);
    expect(res.status).toBe(403);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.MUST_CHANGE_PASSWORD',
    ]);
  });

  it('conta desativada após login não obtém contexto (401)', async () => {
    const victim = await login('me-farizeu', 'noemail');
    const owner = await login('me-farizeu', 'owner');

    const victimUserId = victim.body.userId;
    const deactivate = await request(app.getHttpServer())
      .patch(`/api/accounts/${victimUserId}/status`)
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', owner.accessCookie!)
      .send({ action: 'deactivate' });
    expect(deactivate.status).toBe(200);

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', victim.accessCookie!);
    expect(res.status).toBe(401);

    // Reativa para não afetar outros testes.
    await request(app.getHttpServer())
      .patch(`/api/accounts/${victimUserId}/status`)
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', owner.accessCookie!)
      .send({ action: 'activate' });
  });

  // --- 6.1: role persistida difere da application claim antiga no token ---

  it('role reflete a projeção persistida, não a application claim antiga do token', async () => {
    const before = await login('me-guard', 'roleshift');
    expect(before.status).toBe(200);
    // A claim `role` no token emitido no login é a antiga (USER).
    const claimsBefore = jwt.decode(
      before.accessCookie!.split('=')[1],
    ) as Record<string, unknown>;
    expect(claimsBefore.role).toBe('USER');

    // Muda o role persistido diretamente (divergência entre DB e token antigo).
    await prisma.client.userAccount.update({
      where: { id: before.body.userId },
      data: { role: 'ADMIN' },
    });

    const res = await meWith('me-guard', before.accessCookie!);
    expect(res.status).toBe(200);
    // /me devolve o role persistido atual (ADMIN), não o do token (USER).
    expect((res.body as { role: string }).role).toBe('ADMIN');

    // Restaura.
    await prisma.client.userAccount.update({
      where: { id: before.body.userId },
      data: { role: 'USER' },
    });
  });

  // --- 6.2: códigos estabelecidos do guard preservados ---

  it('token ausente → 401 IDENTITY.INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-guard'));
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.INVALID_CREDENTIALS',
    ]);
  });

  it('token inválido → 401 IDENTITY.INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', hostFor('me-guard'))
      .set('Cookie', 'access_token=not-a-valid-jwt');
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.INVALID_CREDENTIALS',
    ]);
  });

  it('sessão revogada → 401 IDENTITY.SESSION_REVOKED', async () => {
    const sess = await login('me-guard', 'owner');
    await prisma.client.session.update({
      where: { id: sess.body.sessionId },
      data: { revokedAt: new Date() },
    });
    const res = await meWith('me-guard', sess.accessCookie!);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.SESSION_REVOKED',
    ]);
  });

  it('sessão expirada → 401 IDENTITY.SESSION_REVOKED', async () => {
    const sess = await login('me-guard', 'owner');
    await prisma.client.session.update({
      where: { id: sess.body.sessionId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const res = await meWith('me-guard', sess.accessCookie!);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.SESSION_REVOKED',
    ]);
  });

  it('conta inativa → 401 IDENTITY.ACCOUNT_INACTIVE', async () => {
    const victim = await login('me-guard', 'deactme');
    await prisma.client.userAccount.update({
      where: { id: victim.body.userId },
      data: { status: 'INACTIVE' },
    });
    const res = await meWith('me-guard', victim.accessCookie!);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.ACCOUNT_INACTIVE',
    ]);
  });

  it('conta BLOCKED → 401 IDENTITY.ACCOUNT_INACTIVE', async () => {
    const victim = await login('me-guard', 'blockme');
    await prisma.client.userAccount.update({
      where: { id: victim.body.userId },
      data: { status: 'BLOCKED' },
    });
    const res = await meWith('me-guard', victim.accessCookie!);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.ACCOUNT_INACTIVE',
    ]);
  });

  it('banca inativa → 401 IDENTITY.BANCA_INACTIVE', async () => {
    // Usa banca dedicada (me-guard2) para não afetar os demais cenários.
    const sess = await login('me-guard2', 'owner');
    await prisma.client.banca.update({
      where: { id: bancaIds['me-guard2'] },
      data: { status: 'INACTIVE' },
    });
    const res = await meWith('me-guard2', sess.accessCookie!);
    expect(res.status).toBe(401);
    expect((res.body as { message: string[] }).message).toEqual([
      'IDENTITY.BANCA_INACTIVE',
    ]);

    // Restaura.
    await prisma.client.banca.update({
      where: { id: bancaIds['me-guard2'] },
      data: { status: 'ACTIVE' },
    });
  });

  // --- 6.6: tokens de login e refresh mantêm application claims mínimas ---

  const APP_CLAIMS = [
    'sub',
    'bancaId',
    'sessionId',
    'role',
    'mustChangePassword',
  ];
  const STANDARD_CLAIMS = ['iat', 'exp'];
  const FORBIDDEN_CLAIMS = [
    'name',
    'username',
    'email',
    'codigoBanca',
    'nome',
    'bancaName',
  ];

  function assertMinimalAccessClaims(token: string) {
    const claims = jwt.decode(token) as Record<string, unknown>;
    const keys = Object.keys(claims).sort();
    // Somente application claims + claims padrão do JWT (iat/exp) são permitidas.
    expect(keys).toEqual([...APP_CLAIMS, ...STANDARD_CLAIMS].sort());
    for (const forbidden of FORBIDDEN_CLAIMS) {
      expect(claims[forbidden]).toBeUndefined();
    }
    expect(typeof claims.sub).toBe('string');
    expect(typeof claims.bancaId).toBe('string');
    expect(typeof claims.sessionId).toBe('string');
    expect(claims.role).toBe('OWNER');
    expect(claims.mustChangePassword).toBe(false);
  }

  it('access token do login contém apenas application claims + iat/exp', async () => {
    const owner = await login('me-farizeu', 'owner');
    assertMinimalAccessClaims(owner.accessCookie!.split('=')[1]);
  });

  it('access token do refresh contém apenas application claims + iat/exp', async () => {
    const owner = await login('me-farizeu', 'owner');
    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Host', hostFor('me-farizeu'))
      .set('Cookie', owner.refreshCookie!)
      .send({});
    expect(refreshed.status).toBe(200);
    const setCookies = refreshed.headers['set-cookie'] as unknown as string[];
    assertMinimalAccessClaims(
      cookieValue(setCookies, 'access_token').split('=')[1],
    );
  });
});
