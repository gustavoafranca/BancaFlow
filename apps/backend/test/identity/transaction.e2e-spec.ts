import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '@bancaflow/shared';
import type {
  ChangePasswordUseCase,
  CreateUserAccountUseCase,
  LoginUseCase,
  SessionRepository,
} from '@bancaflow/identity';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/db/prisma.service';
import { SessionRepositoryPrisma } from './../../src/modules/identity/adapters/session.repository.prisma';
import {
  ACCESS_TOKEN_ISSUER,
  CHANGE_PASSWORD_USE_CASE,
  CREATE_USER_ACCOUNT_USE_CASE,
  LOGIN_USE_CASE,
  SESSION_REPOSITORY,
} from './../../src/modules/identity/identity.tokens';

const PASSWORD = 'OwnerPass@123';
const CODES = ['test-tx-login', 'test-tx-password'];

/**
 * Prova a semântica de `runInTransactionResult` (D3) fim a fim contra o banco
 * real: quando um passo POSTERIOR à escrita de domínio falha (emissão de
 * token, revogação de sessões), a transação inteira é revertida — nenhuma
 * escrita parcial fica persistida. Cada teste substitui uma porta concreta
 * por um fake que falha deliberadamente, mantendo o resto do módulo real.
 */
describe('Identity — transação (integration, real database)', () => {
  async function cleanup(prisma: PrismaService): Promise<void> {
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

  async function seedBancaWithOwner(
    prisma: PrismaService,
    createAccount: CreateUserAccountUseCase,
    codigo: string,
  ): Promise<{ bancaId: string; userId: string }> {
    const banca = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: codigo,
        nome: codigo,
        status: 'ACTIVE',
      },
    });
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
    return { bancaId: banca.id, userId: created.instance.userId };
  }

  describe('login: falha na emissão do token reverte a transação inteira', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let loginUseCase: LoginUseCase;
    let bancaId: string;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ACCESS_TOKEN_ISSUER)
        .useValue({
          // Simula falha de infraestrutura na emissão do access token
          // (ex.: JWT_SECRET indisponível momentaneamente).
          issue: () =>
            Promise.resolve(Result.fail('SIMULATED_TOKEN_ISSUANCE_FAILURE')),
        })
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = app.get(PrismaService);
      const createAccount = app.get<CreateUserAccountUseCase>(
        CREATE_USER_ACCOUNT_USE_CASE,
      );
      loginUseCase = app.get<LoginUseCase>(LOGIN_USE_CASE);

      await cleanup(prisma);
      const seeded = await seedBancaWithOwner(
        prisma,
        createAccount,
        'test-tx-login',
      );
      bancaId = seeded.bancaId;
    });

    afterAll(async () => {
      await cleanup(prisma);
      await app.close();
    });

    it('não persiste sessão nem reseta o contador de falhas quando a emissão do token falha', async () => {
      // Uma falha real ANTES da tentativa com token quebrado, para provar que
      // o reset do contador (dentro da MESMA transação da sessão/token) não
      // fica persistido quando o passo final falha.
      const wrongPassword = await loginUseCase.execute({
        codigoBanca: 'test-tx-login',
        username: 'owner',
        password: 'senha-errada',
      });
      expect(wrongPassword.isFailure).toBe(true);

      const afterWrongPassword = await prisma.client.userAccount.findFirst({
        where: { bancaId },
      });
      expect(afterWrongPassword?.failedLoginAttempts).toBe(1);

      const result = await loginUseCase.execute({
        codigoBanca: 'test-tx-login',
        username: 'owner',
        password: PASSWORD,
      });
      expect(result.isFailure).toBe(true);

      // Rollback: o reset de `failedLoginAttempts` (dentro da transação que
      // também criaria a sessão e emitiria o token) NÃO foi persistido — o
      // contador permanece exatamente como estava antes da tentativa.
      const account = await prisma.client.userAccount.findFirst({
        where: { bancaId },
      });
      expect(account?.failedLoginAttempts).toBe(1);

      // Nenhuma sessão foi criada.
      const sessions = await prisma.client.session.findMany({
        where: { bancaId },
      });
      expect(sessions).toHaveLength(0);
    });
  });

  describe('troca de senha: falha ao revogar as demais sessões reverte o novo hash', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let bancaId: string;
    let userId: string;
    let originalPasswordHash: string;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = app.get(PrismaService);
      const createAccount = app.get<CreateUserAccountUseCase>(
        CREATE_USER_ACCOUNT_USE_CASE,
      );

      await cleanup(prisma);
      const seeded = await seedBancaWithOwner(
        prisma,
        createAccount,
        'test-tx-password',
      );
      bancaId = seeded.bancaId;
      userId = seeded.userId;

      const row = await prisma.client.userAccount.findFirst({
        where: { bancaId },
      });
      originalPasswordHash = row!.passwordHash;
    });

    afterAll(async () => {
      await cleanup(prisma);
      await app.close();
    });

    it('reverte o hash novo quando revokeOtherSessions falha dentro da mesma transação', async () => {
      // Substituímos apenas o método de revogação por um fake que falha,
      // simulando uma falha de infraestrutura NO MEIO da transação — depois
      // que o hash novo já foi escrito no mesmo `tx`, mas antes do commit.
      const sessionRepositoryModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(SESSION_REPOSITORY)
        .useFactory({
          factory: (prismaService: PrismaService): SessionRepository => {
            const real = new SessionRepositoryPrisma(prismaService);
            return {
              nextId: () => real.nextId(),
              findById: (sessionId: string, bancaId: string) =>
                real.findById(sessionId, bancaId),
              findByDigest: (digest: string) => real.findByDigest(digest),
              findActiveByUser: (userId: string, bancaId: string) =>
                real.findActiveByUser(userId, bancaId),
              save: (session) => real.save(session),
              revokeAll: (userId: string, bancaId: string, revokedAt: Date) =>
                real.revokeAll(userId, bancaId, revokedAt),
              rotateIfDigestMatches: (
                sessionId,
                oldDigest,
                newDigest,
                newExpiresAt,
                now,
              ) =>
                real.rotateIfDigestMatches(
                  sessionId,
                  oldDigest,
                  newDigest,
                  newExpiresAt,
                  now,
                ),
              // Falha deliberada: simula um erro de infraestrutura na
              // revogação das demais sessões.
              revokeOtherSessions: () =>
                Promise.resolve(Result.fail('SIMULATED_REVOKE_FAILURE')),
            };
          },
          inject: [PrismaService],
        })
        .compile();

      const fakeApp = sessionRepositoryModule.createNestApplication();
      await fakeApp.init();
      try {
        const fakeChangePassword = fakeApp.get<ChangePasswordUseCase>(
          CHANGE_PASSWORD_USE_CASE,
        );
        const result = await fakeChangePassword.execute({
          bancaId,
          userId,
          currentPassword: PASSWORD,
          newPassword: 'NovaSenhaForte@456',
        });
        expect(result.isFailure).toBe(true);
      } finally {
        await fakeApp.close();
      }

      // Rollback: o hash novo NÃO foi persistido — a senha atual ainda é a original.
      const account = await prisma.client.userAccount.findFirst({
        where: { bancaId },
      });
      expect(account?.passwordHash).toBe(originalPasswordHash);
    });
  });
});
