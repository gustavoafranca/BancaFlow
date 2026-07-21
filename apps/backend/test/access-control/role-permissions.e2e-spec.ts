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

const PASSWORD = 'AccessCtrl@123';
const CODE = 'test-access-control';

interface RolePermissionEntryBody {
  key: string;
  label: string;
  description: string;
  order: number;
  roles: string[];
}
interface RolePermissionCapabilityBody {
  capability: string;
  label: string;
  order: number;
  permissions: RolePermissionEntryBody[];
}
interface RolePermissionMatrixBody {
  capabilities: RolePermissionCapabilityBody[];
}
interface OwnEffectivePermissionsBody {
  role: string;
  permissions: { key: string; label: string }[];
}

/**
 * Prova ponta a ponta que o endpoint da própria matriz é autorizado via
 * `hasPermission`, sem exceção — e que USER nunca vê a matriz completa,
 * apenas suas próprias permissões efetivas via `/me/permissions`.
 */
describe('Access Control — role-permissions e me/permissions (integration, real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bancaId: string;
  let previousSuffix: string | undefined;

  async function cleanup(): Promise<void> {
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: CODE } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: CODE } },
    });
    await prisma.client.banca.deleteMany({ where: { codigoBanca: CODE } });
  }

  const hostFor = () => `${CODE}.bancaflow.com.br`;

  function cookieValue(setCookies: string[], name: string): string {
    return setCookies.find((c) => c.startsWith(`${name}=`))!.split(';')[0];
  }

  async function loginAs(username: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor())
      .send({ username, password: PASSWORD });
    expect(res.status).toBe(200);
    return cookieValue(
      res.headers['set-cookie'] as unknown as string[],
      'access_token',
    );
  }

  beforeAll(async () => {
    // Determinístico independente do `.env` local (que em dev usa
    // `.localhost`, ver `apps/backend/.env`): mesmo padrão de override de
    // `test/tenancy/tenant-context.e2e-spec.ts`/`refresh-clears-cookies-on-failure.e2e-spec.ts`.
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
        codigoBanca: CODE,
        nome: CODE,
        status: 'ACTIVE',
      },
    });
    bancaId = banca.id;

    for (const [username, name, role] of [
      ['owner', 'Owner Silva', 'OWNER'],
      ['admin', 'Admin Silva', 'ADMIN'],
      ['member', 'Member Silva', 'USER'],
    ] as const) {
      const created = await createAccount.execute({
        bancaId,
        username,
        name,
        password: PASSWORD,
        role,
      });
      if (created.isFailure) {
        throw new Error(
          `seed ${username} falhou: ${created.errors?.join(',')}`,
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

  it('OWNER lê a matriz completa com os 3 papéis reais, nunca os perfis fictícios', async () => {
    const cookie = await loginAs('owner');
    const res = await request(app.getHttpServer())
      .get('/api/access-control/role-permissions')
      .set('Host', hostFor())
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    const body = res.body as RolePermissionMatrixBody;
    const allRoles = body.capabilities.flatMap((c) =>
      c.permissions.flatMap((p) => p.roles),
    );
    expect(new Set(allRoles)).toEqual(new Set(['OWNER', 'ADMIN', 'USER']));
    for (const fake of [
      'Administrador',
      'Operador',
      'Cambista',
      'Somente Leitura',
    ]) {
      expect(allRoles).not.toContain(fake);
    }
  });

  it('ADMIN é negado ao tentar ler a matriz completa nesta versão (só OWNER administra contas e acessos)', async () => {
    const cookie = await loginAs('admin');
    const res = await request(app.getHttpServer())
      .get('/api/access-control/role-permissions')
      .set('Host', hostFor())
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('USER é negado ao tentar ler a matriz completa (hasPermission nega access-control.role-permissions.read)', async () => {
    const cookie = await loginAs('member');
    const res = await request(app.getHttpServer())
      .get('/api/access-control/role-permissions')
      .set('Host', hostFor())
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('qualquer papel lê somente suas próprias permissões efetivas em /me/permissions', async () => {
    const ownerCookie = await loginAs('owner');
    const ownerRes = await request(app.getHttpServer())
      .get('/api/access-control/me/permissions')
      .set('Host', hostFor())
      .set('Cookie', ownerCookie);
    expect(ownerRes.status).toBe(200);
    const ownerBody = ownerRes.body as OwnEffectivePermissionsBody;
    expect(ownerBody.role).toBe('OWNER');
    expect(ownerBody.permissions.map((p) => p.key)).toContain(
      'access-control.role-permissions.read',
    );

    const adminCookie = await loginAs('admin');
    const adminRes = await request(app.getHttpServer())
      .get('/api/access-control/me/permissions')
      .set('Host', hostFor())
      .set('Cookie', adminCookie);
    expect(adminRes.status).toBe(200);
    const adminBody = adminRes.body as OwnEffectivePermissionsBody;
    expect(adminBody.role).toBe('ADMIN');
    const adminKeys = adminBody.permissions.map((p) => p.key);
    expect(adminKeys).not.toContain('identity.accounts.toggle-status');
    expect(adminKeys).toContain('participants.betting-agents.create');

    const memberCookie = await loginAs('member');
    const memberRes = await request(app.getHttpServer())
      .get('/api/access-control/me/permissions')
      .set('Host', hostFor())
      .set('Cookie', memberCookie);
    expect(memberRes.status).toBe(200);
    const memberBody = memberRes.body as OwnEffectivePermissionsBody;
    expect(memberBody.role).toBe('USER');
    const memberKeys = memberBody.permissions.map((p) => p.key);
    expect(memberKeys.sort()).toEqual(
      [
        'identity.profile.read-own',
        'identity.profile.update-own',
        'identity.password.change-own',
        'participants.betting-agents.list',
        'participants.betting-agents.read',
      ].sort(),
    );
    expect(memberKeys).not.toContain('identity.accounts.toggle-status');
  });
});
