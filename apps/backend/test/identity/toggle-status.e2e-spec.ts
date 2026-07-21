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
const CODE = 'test-toggle-revoke';

/**
 * Prova ponta a ponta (P1-6 — decisão 6 revisada pós-review) que a orquestração
 * "mudar status → revogar sessões" agora vive no `ToggleAccountStatusUseCase`,
 * NÃO em `UserAccountRepositoryPrisma.save()`: ao bloquear/desativar uma conta
 * com múltiplas sessões ativas, TODAS devem ficar com `revokedAt` preenchido
 * logo em seguida — mesmo com a revogação tendo saído do adapter.
 */
describe('ToggleAccountStatusUseCase — revogação de sessões (integration, real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bancaId: string;
  let memberUserId: string;

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

    const banca = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: CODE,
        nome: CODE,
        status: 'ACTIVE',
      },
    });
    bancaId = banca.id;

    const owner = await createAccount.execute({
      bancaId,
      username: 'owner',
      name: 'Owner Silva',
      password: PASSWORD,
      role: 'OWNER',
    });
    if (owner.isFailure) {
      throw new Error(`seed owner falhou: ${owner.errors?.join(',')}`);
    }

    const member = await createAccount.execute({
      bancaId,
      username: 'member',
      name: 'Member Silva',
      password: PASSWORD,
      role: 'USER',
    });
    if (member.isFailure) {
      throw new Error(`seed member falhou: ${member.errors?.join(',')}`);
    }
    memberUserId = member.instance.userId;
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

  it('bloquear a conta revoga TODAS as sessões ativas do usuário (via caso de uso, não pelo adapter)', async () => {
    const owner = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor())
      .send({ username: 'owner', password: PASSWORD });
    expect(owner.status).toBe(200);
    const ownerAccessCookie = cookieValue(
      owner.headers['set-cookie'] as unknown as string[],
      'access_token',
    );

    // O membro autentica em DOIS dispositivos, gerando duas sessões ativas.
    const deviceA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor())
      .send({ username: 'member', password: PASSWORD });
    const deviceB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor())
      .send({ username: 'member', password: PASSWORD });
    expect(deviceA.status).toBe(200);
    expect(deviceB.status).toBe(200);

    const activeBefore = await prisma.client.session.findMany({
      where: { userId: memberUserId, bancaId, revokedAt: null },
    });
    expect(activeBefore.length).toBeGreaterThanOrEqual(2);

    const block = await request(app.getHttpServer())
      .patch(`/api/accounts/${memberUserId}/status`)
      .set('Host', hostFor())
      .set('Cookie', ownerAccessCookie)
      .send({ action: 'block' });
    expect(block.status).toBe(200);

    // Prova ponta a ponta: TODAS as sessões do membro foram revogadas
    // imediatamente, orquestradas pelo `ToggleAccountStatusUseCase`.
    const allSessions = await prisma.client.session.findMany({
      where: { userId: memberUserId, bancaId },
    });
    expect(allSessions.length).toBeGreaterThanOrEqual(2);
    expect(allSessions.every((s) => s.revokedAt !== null)).toBe(true);

    const activeAfter = await prisma.client.session.findMany({
      where: { userId: memberUserId, bancaId, revokedAt: null },
    });
    expect(activeAfter).toHaveLength(0);

    // Login volta a falhar (conta bloqueada).
    const blockedLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor())
      .send({ username: 'member', password: PASSWORD });
    expect(blockedLogin.status).toBe(401);

    // Token antigo (de ANTES do bloqueio) não funciona mais em rota protegida
    // — a sessão já está revogada e a conta está BLOCKED (dupla rejeição pelo
    // guard). Cobre o critério 26.1 "token antigo de conta bloqueada não
    // funciona".
    const memberAccessCookieA = cookieValue(
      deviceA.headers['set-cookie'] as unknown as string[],
      'access_token',
    );
    const protectedWithOldToken = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor())
      .set('Cookie', memberAccessCookieA);
    expect(protectedWithOldToken.status).toBe(401);

    // Desbloquear NÃO ressuscita as sessões revogadas: o token antigo continua
    // inválido — a conta precisa autenticar de novo. Cobre "conta reativada
    // requer novo login".
    const unblock = await request(app.getHttpServer())
      .patch(`/api/accounts/${memberUserId}/status`)
      .set('Host', hostFor())
      .set('Cookie', ownerAccessCookie)
      .send({ action: 'unblock' });
    expect(unblock.status).toBe(200);

    const protectedWithOldTokenAfterUnblock = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor())
      .set('Cookie', memberAccessCookieA);
    expect(protectedWithOldTokenAfterUnblock.status).toBe(401);

    // Um NOVO login, após o desbloqueio, funciona normalmente.
    const freshLoginAfterUnblock = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor())
      .send({ username: 'member', password: PASSWORD });
    expect(freshLoginAfterUnblock.status).toBe(200);
  });
});
