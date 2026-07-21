import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  CreateUserAccountUseCase,
  SessionRepository,
} from '@bancaflow/identity';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/db/prisma.service';
import {
  CREATE_USER_ACCOUNT_USE_CASE,
  SESSION_REPOSITORY,
} from './../../src/modules/identity/identity.tokens';

const PASSWORD = 'OwnerPass@123';
const CODE = 'test-rotate-race';

/**
 * Prova a correção da corrida na rotação de refresh token (P1-7 — decisão 4b
 * revisada) DIRETAMENTE no adapter `SessionRepositoryPrisma.rotateIfDigestMatches`
 * (contra o banco real), reproduzindo os dois cenários descritos na tasks.md
 * 39.2/39.3: sessão revogada entre a leitura de domínio e a tentativa de
 * rotação, e sessão cujo `expiresAt` já passou segundo o `now` controlado
 * (nunca `new Date()` no adapter). Em ambos, 0 linhas devem ser afetadas —
 * `Result.ok(null)` — sem rotacionar o digest.
 */
describe('SessionRepositoryPrisma.rotateIfDigestMatches — corrida (integration, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessions: SessionRepository;
  let userId: string;
  let bancaId: string;

  async function cleanup(): Promise<void> {
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: CODE } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: CODE } },
    });
    await prisma.client.banca.deleteMany({ where: { codigoBanca: CODE } });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    sessions = app.get<SessionRepository>(SESSION_REPOSITORY);
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
    const created = await createAccount.execute({
      bancaId,
      username: 'owner',
      name: 'Owner Silva',
      password: PASSWORD,
      role: 'OWNER',
    });
    if (created.isFailure) {
      throw new Error(`seed falhou: ${created.errors?.join(',')}`);
    }
    userId = created.instance.userId;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function createSessionRow(overrides: {
    revokedAt: Date | null;
    expiresAt: Date;
    refreshTokenDigest: string;
  }): Promise<string> {
    const id = randomUUID();
    await prisma.client.session.create({
      data: {
        id,
        userId,
        bancaId,
        refreshTokenDigest: overrides.refreshTokenDigest,
        expiresAt: overrides.expiresAt,
        revokedAt: overrides.revokedAt,
        deviceInfo: null,
      },
    });
    return id;
  }

  it('sessão revogada entre a leitura e a rotação: 0 linhas afetadas (Result.ok(null)), digest não muda', async () => {
    const oldDigest = `digest-revoked-${randomUUID()}`;
    const sessionId = await createSessionRow({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      refreshTokenDigest: oldDigest,
    });

    // Simula a corrida: a sessão é revogada (ex.: logout em outro dispositivo,
    // bloqueio administrativo) ENTRE a leitura de domínio e o UPDATE de rotação.
    await prisma.client.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    const result = await sessions.rotateIfDigestMatches(
      sessionId,
      oldDigest,
      `new-digest-${randomUUID()}`,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    expect(result.isOk).toBe(true);
    expect(result.instance).toBeNull();

    const row = await prisma.client.session.findUnique({
      where: { id: sessionId },
    });
    expect(row?.refreshTokenDigest).toBe(oldDigest);
  });

  it('sessão com expiresAt já passado segundo o now controlado: 0 linhas afetadas, sem rotacionar', async () => {
    const oldDigest = `digest-expired-${randomUUID()}`;
    const expiresAt = new Date(Date.now() - 60_000); // já expirada
    const sessionId = await createSessionRow({
      revokedAt: null,
      expiresAt,
      refreshTokenDigest: oldDigest,
    });

    const result = await sessions.rotateIfDigestMatches(
      sessionId,
      oldDigest,
      `new-digest-${randomUUID()}`,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      new Date(), // now > expiresAt
    );

    expect(result.isOk).toBe(true);
    expect(result.instance).toBeNull();

    const row = await prisma.client.session.findUnique({
      where: { id: sessionId },
    });
    expect(row?.refreshTokenDigest).toBe(oldDigest);
  });

  it('caminho feliz de controle: sessão ativa e não expirada rotaciona normalmente', async () => {
    const oldDigest = `digest-happy-${randomUUID()}`;
    const newDigest = `new-digest-${randomUUID()}`;
    const sessionId = await createSessionRow({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      refreshTokenDigest: oldDigest,
    });

    const result = await sessions.rotateIfDigestMatches(
      sessionId,
      oldDigest,
      newDigest,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    expect(result.isOk).toBe(true);
    expect(result.instance).not.toBeNull();

    const row = await prisma.client.session.findUnique({
      where: { id: sessionId },
    });
    expect(row?.refreshTokenDigest).toBe(newDigest);
  });
});
