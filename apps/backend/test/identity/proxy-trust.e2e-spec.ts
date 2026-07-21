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
const CODES = ['test-proxy-real', 'test-proxy-forged'];

/**
 * Prova a fronteira de proxy (P1-5 — decisão 11 revisada): `X-Forwarded-Host`
 * só é honrado quando `TRUST_PROXY_HOST=true` **E** o peer TCP imediato está
 * na allowlist `TRUSTED_PROXY_IPS`. Este teste cobre o caso mais simples e
 * determinístico via HTTP real: SEM `TRUSTED_PROXY_IPS` configurada (vazia),
 * nenhum `X-Forwarded-Host` é honrado, mesmo com `TRUST_PROXY_HOST=true` —
 * mesmo que o header aponte para outro subdomínio VÁLIDO do BancaFlow.
 *
 * O teste unitário de `TenantResolverMiddleware` (`tenant-resolver.middleware.spec.ts`)
 * cobre o cenário completo (peer dentro/fora da allowlist), pois o harness de
 * e2e (supertest) não permite controlar `req.socket.remoteAddress` — o peer
 * observado pelo servidor HTTP em memória é sempre local.
 */
describe('Identity — fronteira de proxy confiável (integration, real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const bancaIds: Record<string, string> = {};
  let previousTrustProxyHost: string | undefined;
  let previousTrustedProxyIps: string | undefined;
  let previousSuffix: string | undefined;

  beforeAll(async () => {
    previousTrustProxyHost = process.env.TRUST_PROXY_HOST;
    previousTrustedProxyIps = process.env.TRUSTED_PROXY_IPS;
    // TRUST_PROXY_HOST=true mas SEM allowlist configurada — condição
    // insuficiente sozinha para honrar X-Forwarded-Host.
    process.env.TRUST_PROXY_HOST = 'true';
    delete process.env.TRUSTED_PROXY_IPS;
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

    await cleanup(prisma);

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
    await cleanup(prisma);
    await app.close();
    if (previousTrustProxyHost === undefined) {
      delete process.env.TRUST_PROXY_HOST;
    } else {
      process.env.TRUST_PROXY_HOST = previousTrustProxyHost;
    }
    if (previousTrustedProxyIps === undefined) {
      delete process.env.TRUSTED_PROXY_IPS;
    } else {
      process.env.TRUSTED_PROXY_IPS = previousTrustedProxyIps;
    }
    if (previousSuffix === undefined) {
      delete process.env.BANCA_HOST_SUFFIX;
    } else {
      process.env.BANCA_HOST_SUFFIX = previousSuffix;
    }
  });

  async function cleanup(prismaService: PrismaService): Promise<void> {
    await prismaService.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prismaService.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: { in: CODES } } },
    });
    await prismaService.client.banca.deleteMany({
      where: { codigoBanca: { in: CODES } },
    });
  }

  it('sem TRUSTED_PROXY_IPS configurada, X-Forwarded-Host forjado (subdomínio válido) NÃO sequestra o tenant', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', 'test-proxy-real.bancaflow.com.br')
      .set('X-Forwarded-Host', 'test-proxy-forged.bancaflow.com.br')
      .send({ username: 'owner', password: PASSWORD });

    expect(res.status).toBe(200);
    const body = res.body as { bancaId: string };
    // Resolveu pela banca do Host real, NUNCA pela forjada via X-Forwarded-Host.
    expect(body.bancaId).toBe(bancaIds['test-proxy-real']);
    expect(body.bancaId).not.toBe(bancaIds['test-proxy-forged']);
  });
});
