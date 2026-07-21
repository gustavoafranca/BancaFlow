import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../../src/app.module';
import { ApiExceptionFilter } from './../../src/shared/errors/api-exception.filter';
import { PrismaService } from './../../src/db/prisma.service';

const CODES = ['tc-active', 'tc-inactive'];

/**
 * e2e de `GET /api/tenant-context` (D6 do design.md de
 * `review-web-frontend-architecture`): banca ativa, banca inativa, banca
 * inexistente, host reservado e formato de código inválido devem ser
 * INDISTINGUÍVEIS entre si exceto pela única banca ativa — mesmo HTTP 200,
 * mesmo shape de corpo, nunca 404/401 (o que permitiria enumeração de
 * tenants). A UI (`app/unavailable`) só decide "disponível" vs "indisponível"
 * a partir do booleano `available`.
 */
describe('Tenant context (e2e) — GET /api/tenant-context', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previousSuffix: string | undefined;

  async function cleanup(): Promise<void> {
    await prisma.client.banca.deleteMany({
      where: { codigoBanca: { in: CODES } },
    });
  }

  beforeAll(async () => {
    // Determinístico independente do `.env` local (que em dev usa
    // `.localhost`, ver `apps/backend/.env`): fixa o sufixo usado pelos
    // demais e2e de identity, mesmo padrão de override de
    // `test/identity/proxy-trust.e2e-spec.ts`.
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

    await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: 'tc-active',
        nome: 'Banca Ativa',
        status: 'ACTIVE',
      },
    });
    await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: 'tc-inactive',
        nome: 'Banca Inativa',
        status: 'INACTIVE',
      },
    });
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

  const tenantContextFor = (host: string) =>
    request(app.getHttpServer()).get('/api/tenant-context').set('Host', host);

  it('banca ativa: available=true', async () => {
    const res = await tenantContextFor(hostFor('tc-active'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });
  });

  it('banca inativa: available=false, mesmo status/shape que inexistente', async () => {
    const res = await tenantContextFor(hostFor('tc-inactive'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it('banca inexistente (formato válido): available=false', async () => {
    const res = await tenantContextFor(hostFor('tc-nao-existe'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it('código de formato inválido (curto demais): available=false, mesmo contrato', async () => {
    const res = await tenantContextFor(hostFor('ab'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it('subdomínio reservado (api): available=false', async () => {
    const res = await tenantContextFor('api.bancaflow.com.br');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it('host fora do sufixo configurado (sem tenant algum): available=false', async () => {
    const res = await tenantContextFor('localhost');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it('todas as respostas negativas têm exatamente o mesmo shape (não enumerável)', async () => {
    const [inactive, missing, badFormat, reserved] = await Promise.all([
      tenantContextFor(hostFor('tc-inactive')),
      tenantContextFor(hostFor('tc-nao-existe')),
      tenantContextFor(hostFor('ab')),
      tenantContextFor('api.bancaflow.com.br'),
    ]);
    for (const res of [inactive, missing, badFormat, reserved]) {
      expect(res.status).toBe(200);
      expect(Object.keys(res.body as object)).toEqual(['available']);
      expect((res.body as { available: boolean }).available).toBe(false);
    }
  });

  // Mitigação de risco explícita do design.md ("endpoint público de contexto
  // por host pode permitir enumeração de tenants" -> rate limiting): acima do
  // limite configurado (30 req/10s por IP), o endpoint responde 429 em vez de
  // seguir consultando o banco indefinidamente por host.
  it('acima do limite configurado, responde 429 (rate limiting por IP)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 35; i++) {
      const res = await tenantContextFor(hostFor(`tc-rl-${i}`));
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
    expect(statuses.filter((s) => s === 200).length).toBeLessThanOrEqual(30);
  });
});
