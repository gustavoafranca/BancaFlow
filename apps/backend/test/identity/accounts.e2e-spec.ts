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

const PASSWORD = 'AccountsCtrl@123';
const CODE_A = 'test-accounts-a';
const CODE_B = 'test-accounts-b';

interface UserAccountListItemBody {
  userId: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
}
interface UserAccountsPageBody {
  data: UserAccountListItemBody[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
interface UserAccountDetailBody extends UserAccountListItemBody {
  version: number;
  mustChangePassword: boolean;
  passwordHash?: string;
}
interface CreateUserAccountBody {
  userId: string;
  username: string;
  role: string;
  temporaryPassword: string;
}
interface OwnEffectivePermissionsBody {
  role: string;
  permissions: { key: string; label: string }[];
}
interface AccountSessionBody {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  deviceInfo?: string;
}

/**
 * Prova ponta a ponta o recurso `/api/accounts` (change
 * `enable-tenant-user-administration`): listagem/detalhe/criação/edição/
 * troca de papel/sessões de terceiro, todas exclusivas de `OWNER`, com o
 * contrato de erro `403` (falta de permissão) vs. `404` (alvo inexistente
 * ou de outra banca) — nunca o contrário (ver `design.md` D11).
 */
describe('AccountsController — /api/accounts (integration, real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bancaAId: string;
  let bancaBId: string;
  let ownerAId: string;
  let adminAId: string;
  let memberAId: string;
  let ownerBId: string;
  let previousSuffix: string | undefined;

  async function cleanup(): Promise<void> {
    await prisma.client.session.deleteMany({
      where: {
        userAccount: { banca: { codigoBanca: { in: [CODE_A, CODE_B] } } },
      },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: { in: [CODE_A, CODE_B] } } },
    });
    await prisma.client.banca.deleteMany({
      where: { codigoBanca: { in: [CODE_A, CODE_B] } },
    });
  }

  const hostFor = (codigo: string) => `${codigo}.bancaflow.com.br`;

  function cookieValue(setCookies: string[], name: string): string {
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) {
      throw new Error(`cookie ${name} não encontrado`);
    }
    return found.split(';')[0];
  }

  async function loginAs(
    codigo: string,
    username: string,
    password = PASSWORD,
  ) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(codigo))
      .send({ username, password });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return {
      status: res.status,
      body: res.body as { userId: string; sessionId: string },
      accessCookie: setCookies
        ? cookieValue(setCookies, 'access_token')
        : undefined,
    };
  }

  beforeAll(async () => {
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

    const bancaA = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: CODE_A,
        nome: CODE_A,
        status: 'ACTIVE',
      },
    });
    bancaAId = bancaA.id;
    const bancaB = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: CODE_B,
        nome: CODE_B,
        status: 'ACTIVE',
      },
    });
    bancaBId = bancaB.id;

    async function seed(
      bancaId: string,
      username: string,
      role: 'OWNER' | 'ADMIN' | 'USER',
    ) {
      const created = await createAccount.execute({
        bancaId,
        username,
        name: `${username[0].toUpperCase()}${username.slice(1)} Silva`,
        password: PASSWORD,
        role,
      });
      if (created.isFailure) {
        throw new Error(
          `seed ${username} falhou: ${created.errors?.join(',')}`,
        );
      }
      return created.instance.userId;
    }

    ownerAId = await seed(bancaAId, 'owner', 'OWNER');
    adminAId = await seed(bancaAId, 'admin', 'ADMIN');
    memberAId = await seed(bancaAId, 'member', 'USER');
    ownerBId = await seed(bancaBId, 'ownerb', 'OWNER');
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

  describe('GET /api/accounts (listagem)', () => {
    it('OWNER lista as contas ADMIN/USER da própria banca, sem incluir o OWNER', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);

      expect(res.status).toBe(200);
      const body = res.body as UserAccountsPageBody;
      const ids = body.data.map((a) => a.userId);
      expect(ids).toEqual(expect.arrayContaining([adminAId, memberAId]));
      expect(ids).not.toContain(ownerAId);
    });

    it('a contagem/paginação nunca inclui o OWNER, mesmo com pageSize pequeno', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .get('/api/accounts?page=1&pageSize=1')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);

      expect(res.status).toBe(200);
      const body = res.body as UserAccountsPageBody;
      expect(body.data).toHaveLength(1);
      // total conta exatamente as 2 contas administráveis (admin + member), nunca o owner.
      expect(body.meta.total).toBe(2);
      expect(body.meta.totalPages).toBe(2);
    });

    it('busca e filtros de papel/status são aplicados', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const bySearch = await request(app.getHttpServer())
        .get('/api/accounts?search=member')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(bySearch.status).toBe(200);
      const bySearchBody = bySearch.body as UserAccountsPageBody;
      expect(bySearchBody.data.map((a) => a.userId)).toEqual([memberAId]);

      const byRole = await request(app.getHttpServer())
        .get('/api/accounts?role=ADMIN')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(byRole.status).toBe(200);
      const byRoleBody = byRole.body as UserAccountsPageBody;
      expect(byRoleBody.data.map((a) => a.userId)).toEqual([adminAId]);
    });

    it('ADMIN e USER são negados (403), nunca 404', async () => {
      const admin = await loginAs(CODE_A, 'admin');
      const adminRes = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', admin.accessCookie!);
      expect(adminRes.status).toBe(403);

      const member = await loginAs(CODE_A, 'member');
      const memberRes = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', member.accessCookie!);
      expect(memberRes.status).toBe(403);
    });

    it('rejeita pageSize acima do teto HTTP (400)', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .get('/api/accounts?pageSize=101')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(res.status).toBe(400);
    });

    describe('paginação (zero itens, uma página, múltiplas páginas, última página incompleta)', () => {
      const SEARCH_PREFIX = 'pagtest';
      let pageTestIds: string[];

      beforeAll(async () => {
        const owner = await loginAs(CODE_A, 'owner');
        pageTestIds = [];
        for (const suffix of ['um', 'dois', 'tres']) {
          const username = `${SEARCH_PREFIX}-${suffix}`;
          const res = await request(app.getHttpServer())
            .post('/api/accounts')
            .set('Host', hostFor(CODE_A))
            .set('Cookie', owner.accessCookie!)
            .send({ username, name: `Pagtest ${suffix} Silva`, role: 'USER' });
          if (res.status !== 201) {
            throw new Error(
              `seed ${username} falhou (${res.status}): ${JSON.stringify(res.body)}`,
            );
          }
          pageTestIds.push((res.body as CreateUserAccountBody).userId);
        }
      });

      it('zero itens quando o filtro não corresponde a nenhuma conta', async () => {
        const owner = await loginAs(CODE_A, 'owner');
        const res = await request(app.getHttpServer())
          .get('/api/accounts?search=inexistente-zzz')
          .set('Host', hostFor(CODE_A))
          .set('Cookie', owner.accessCookie!);
        expect(res.status).toBe(200);
        const body = res.body as UserAccountsPageBody;
        expect(body.data).toHaveLength(0);
        expect(body.meta.total).toBe(0);
        expect(body.meta.totalPages).toBe(0);
      });

      it('uma única página quando pageSize comporta todos os itens filtrados', async () => {
        const owner = await loginAs(CODE_A, 'owner');
        const res = await request(app.getHttpServer())
          .get(`/api/accounts?search=${SEARCH_PREFIX}&pageSize=10`)
          .set('Host', hostFor(CODE_A))
          .set('Cookie', owner.accessCookie!);
        expect(res.status).toBe(200);
        const body = res.body as UserAccountsPageBody;
        expect(body.data).toHaveLength(3);
        expect(body.meta.total).toBe(3);
        expect(body.meta.totalPages).toBe(1);
      });

      it('múltiplas páginas com a última incompleta', async () => {
        const owner = await loginAs(CODE_A, 'owner');
        const firstPage = await request(app.getHttpServer())
          .get(`/api/accounts?search=${SEARCH_PREFIX}&pageSize=2&page=1`)
          .set('Host', hostFor(CODE_A))
          .set('Cookie', owner.accessCookie!);
        expect(firstPage.status).toBe(200);
        const firstBody = firstPage.body as UserAccountsPageBody;
        expect(firstBody.data).toHaveLength(2);
        expect(firstBody.meta.totalPages).toBe(2);

        const lastPage = await request(app.getHttpServer())
          .get(`/api/accounts?search=${SEARCH_PREFIX}&pageSize=2&page=2`)
          .set('Host', hostFor(CODE_A))
          .set('Cookie', owner.accessCookie!);
        expect(lastPage.status).toBe(200);
        const lastBody = lastPage.body as UserAccountsPageBody;
        expect(lastBody.data).toHaveLength(1);
        expect(lastBody.meta.total).toBe(3);

        const allIds = [...firstBody.data, ...lastBody.data].map(
          (a) => a.userId,
        );
        expect(new Set(allIds)).toEqual(new Set(pageTestIds));
      });
    });
  });

  describe('GET /api/accounts/:accountId (detalhe)', () => {
    it('OWNER consulta o detalhe de uma conta da própria banca', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .get(`/api/accounts/${memberAId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(res.status).toBe(200);
      const body = res.body as UserAccountDetailBody;
      expect(body.userId).toBe(memberAId);
      expect(body.passwordHash).toBeUndefined();
    });

    it('retorna 404 para conta inexistente e para conta de outra banca, nunca 403', async () => {
      const owner = await loginAs(CODE_A, 'owner');

      const notFound = await request(app.getHttpServer())
        .get(`/api/accounts/${randomUUID()}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(notFound.status).toBe(404);

      const crossBanca = await request(app.getHttpServer())
        .get(`/api/accounts/${ownerBId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(crossBanca.status).toBe(404);
    });

    it('rejeita alvo OWNER e autoconsulta com 403', async () => {
      const owner = await loginAs(CODE_A, 'owner');

      const ownerTarget = await request(app.getHttpServer())
        .get(`/api/accounts/${ownerAId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(ownerTarget.status).toBe(403);

      const selfTarget = await request(app.getHttpServer())
        .get(`/api/accounts/${owner.body.userId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(selfTarget.status).toBe(403);
    });
  });

  describe('POST /api/accounts (criação)', () => {
    it('OWNER cria uma conta USER com senha temporária, que precisa trocar no primeiro acesso', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({
          username: 'novo.usuario',
          name: 'Novo Usuario Silva',
          role: 'USER',
        });

      expect(res.status).toBe(201);
      const body = res.body as CreateUserAccountBody;
      expect(typeof body.temporaryPassword).toBe('string');
      expect(body.temporaryPassword.length).toBeGreaterThan(0);

      const firstLogin = await loginAs(
        CODE_A,
        'novo.usuario',
        body.temporaryPassword,
      );
      expect(firstLogin.status).toBe(200);
    });

    it('rejeita role OWNER na criação administrativa (validação de DTO, 400)', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({
          username: 'tentativa.owner',
          name: 'Tentativa Owner Silva',
          role: 'OWNER',
        });
      expect(res.status).toBe(400);
    });

    it('ADMIN e USER não podem criar contas', async () => {
      const admin = await loginAs(CODE_A, 'admin');
      const res = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', admin.accessCookie!)
        .send({
          username: 'nao.deveria',
          name: 'Nao Deveria Silva',
          role: 'USER',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/accounts/:accountId (edição)', () => {
    it('OWNER atualiza nome e e-mail; versão desatualizada retorna 409', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const detail = await request(app.getHttpServer())
        .get(`/api/accounts/${memberAId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      const version = (detail.body as UserAccountDetailBody).version;

      const update = await request(app.getHttpServer())
        .patch(`/api/accounts/${memberAId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({
          name: 'Member Souza',
          email: 'member.souza@example.com',
          version,
        });
      expect(update.status).toBe(200);

      const stale = await request(app.getHttpServer())
        .patch(`/api/accounts/${memberAId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({ name: 'Outro Nome Silva', version });
      expect(stale.status).toBe(409);
    });
  });

  describe('PATCH /api/accounts/:accountId/role (troca de papel)', () => {
    it('promove USER para ADMIN, revoga sessões do alvo, e a matriz nova vale no próximo login', async () => {
      // conta dedicada para não afetar os outros testes que dependem de `memberAId` como USER.
      const owner = await loginAs(CODE_A, 'owner');
      const created = await request(app.getHttpServer())
        .post('/api/accounts')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({ username: 'promovido', name: 'Promovido Silva', role: 'USER' });
      const createdBody = created.body as CreateUserAccountBody;
      const targetId = createdBody.userId;
      const tempPassword = createdBody.temporaryPassword;

      const firstLogin = await loginAs(CODE_A, 'promovido', tempPassword);
      const mandatoryChange = await request(app.getHttpServer())
        .patch('/api/auth/mandatory-password-change')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', firstLogin.accessCookie!)
        .send({ newPassword: PASSWORD });
      expect(mandatoryChange.status).toBe(200);

      const promote = await request(app.getHttpServer())
        .patch(`/api/accounts/${targetId}/role`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({ role: 'ADMIN' });
      expect(promote.status).toBe(200);

      // token antigo (papel USER) foi revogado.
      const oldTokenStillWorks = await request(app.getHttpServer())
        .get('/api/auth/sessions')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', firstLogin.accessCookie!);
      expect(oldTokenStillWorks.status).toBe(401);

      const relogin = await loginAs(CODE_A, 'promovido', PASSWORD);
      expect(relogin.status).toBe(200);

      const myPermissions = await request(app.getHttpServer())
        .get('/api/access-control/me/permissions')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', relogin.accessCookie!);
      expect(myPermissions.status).toBe(200);
      expect((myPermissions.body as OwnEffectivePermissionsBody).role).toBe(
        'ADMIN',
      );
    });

    it('rejeita alvo OWNER e autoconsulta com 403', async () => {
      const owner = await loginAs(CODE_A, 'owner');

      const ownerTarget = await request(app.getHttpServer())
        .patch(`/api/accounts/${ownerAId}/role`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({ role: 'USER' });
      expect(ownerTarget.status).toBe(403);

      const selfTarget = await request(app.getHttpServer())
        .patch(`/api/accounts/${owner.body.userId}/role`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({ role: 'ADMIN' });
      expect(selfTarget.status).toBe(403);
    });

    it('retorna 404 para alvo de outra banca, nunca 403', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .patch(`/api/accounts/${ownerBId}/role`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!)
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(404);
    });
  });

  describe('sessões administrativas de uma conta de terceiro', () => {
    it('OWNER lista e revoga sessões de uma conta USER, sem afetar outras sessões da conta', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const deviceA = await loginAs(CODE_A, 'member');
      const deviceB = await loginAs(CODE_A, 'member');

      const list = await request(app.getHttpServer())
        .get(`/api/accounts/${memberAId}/sessions`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(list.status).toBe(200);
      const sessions = list.body as AccountSessionBody[];
      expect(sessions.every((s) => s.isCurrent === false)).toBe(true);
      const sessionIds = sessions.map((s) => s.sessionId);
      expect(sessionIds).toEqual(
        expect.arrayContaining([
          deviceA.body.sessionId,
          deviceB.body.sessionId,
        ]),
      );

      const revoke = await request(app.getHttpServer())
        .delete(`/api/accounts/${memberAId}/sessions/${deviceA.body.sessionId}`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(revoke.status).toBe(200);

      const deviceAAfter = await request(app.getHttpServer())
        .get('/api/auth/sessions')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', deviceA.accessCookie!);
      expect(deviceAAfter.status).toBe(401);

      const deviceBStillWorks = await request(app.getHttpServer())
        .get('/api/auth/sessions')
        .set('Host', hostFor(CODE_A))
        .set('Cookie', deviceB.accessCookie!);
      expect(deviceBStillWorks.status).toBe(200);
    });

    it('retorna 404 (TARGET_SESSION_NOT_FOUND) para sessão que não pertence à conta indicada', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const adminSession = await loginAs(CODE_A, 'admin');

      const res = await request(app.getHttpServer())
        .delete(
          `/api/accounts/${memberAId}/sessions/${adminSession.body.sessionId}`,
        )
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(res.status).toBe(404);
    });

    it('OWNER não pode consultar/revogar as próprias sessões por este endpoint', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const res = await request(app.getHttpServer())
        .get(`/api/accounts/${owner.body.userId}/sessions`)
        .set('Host', hostFor(CODE_A))
        .set('Cookie', owner.accessCookie!);
      expect(res.status).toBe(403);
    });
  });
});
