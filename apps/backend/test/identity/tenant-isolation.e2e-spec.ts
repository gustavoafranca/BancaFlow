import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import type { CreateUserAccountUseCase } from '@bancaflow/identity';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/db/prisma.service';
import { CREATE_USER_ACCOUNT_USE_CASE } from './../../src/modules/identity/identity.tokens';

const PASSWORD = 'OwnerPass@123';
const CODES = ['test-iso-a', 'test-iso-b'];

/**
 * Prova o isolamento multi-tenant reforçado no banco (D5): username duplicado
 * dentro da MESMA banca é rejeitado pela aplicação (e pela constraint
 * `@@unique([bancaId, normalizedUsername])`), o MESMO username em bancas
 * diferentes é permitido, e a FK composta `Session(userId, bancaId) ->
 * UserAccount(id, bancaId)` impede no banco que uma sessão referencie um
 * usuário de outra banca — mesmo por escrita direta via SQL/Prisma client,
 * contornando a camada de aplicação.
 */
describe('Identity — isolamento multi-tenant (integration, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createAccount: CreateUserAccountUseCase;
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    createAccount = app.get<CreateUserAccountUseCase>(
      CREATE_USER_ACCOUNT_USE_CASE,
    );

    await cleanup();

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
    }
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('permite o MESMO username em bancas diferentes', async () => {
    const inA = await createAccount.execute({
      bancaId: bancaIds['test-iso-a'],
      username: 'joao',
      name: 'Joao Silva',
      password: PASSWORD,
      role: 'OWNER',
    });
    expect(inA.isOk).toBe(true);

    const inB = await createAccount.execute({
      bancaId: bancaIds['test-iso-b'],
      username: 'joao',
      name: 'Joao Pereira',
      password: PASSWORD,
      role: 'OWNER',
    });
    expect(inB.isOk).toBe(true);
    expect(inB.instance.userId).not.toBe(inA.instance.userId);
  });

  it('rejeita username duplicado na MESMA banca', async () => {
    const first = await createAccount.execute({
      bancaId: bancaIds['test-iso-a'],
      username: 'maria',
      name: 'Maria Souza',
      password: PASSWORD,
      role: 'USER',
    });
    expect(first.isOk).toBe(true);

    const duplicate = await createAccount.execute({
      bancaId: bancaIds['test-iso-a'],
      username: 'MARIA', // normalização deve detectar o conflito
      name: 'Maria Outra',
      password: PASSWORD,
      role: 'USER',
    });
    expect(duplicate.isFailure).toBe(true);
    expect(duplicate.errors).toEqual(['IDENTITY.USERNAME_ALREADY_EXISTS']);

    const count = await prisma.client.userAccount.count({
      where: { bancaId: bancaIds['test-iso-a'], normalizedUsername: 'maria' },
    });
    expect(count).toBe(1);
  });

  it('a FK composta (userId, bancaId) impede no banco uma sessão cruzando bancas', async () => {
    const ownerA = await createAccount.execute({
      bancaId: bancaIds['test-iso-a'],
      username: 'owner-fk',
      name: 'Owner FK',
      password: PASSWORD,
      role: 'OWNER',
    });
    expect(ownerA.isOk).toBe(true);

    // Tenta inserir uma Session referenciando o usuário da banca A, mas
    // gravando `bancaId` da banca B — contornando totalmente a camada de
    // aplicação (SQL direto). A FK composta deve rejeitar no banco.
    await expect(
      prisma.client.session.create({
        data: {
          id: randomUUID(),
          userId: ownerA.instance.userId,
          bancaId: bancaIds['test-iso-b'],
          refreshTokenDigest: `forged-${randomUUID()}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    const sessions = await prisma.client.session.findMany({
      where: { userId: ownerA.instance.userId },
    });
    expect(sessions).toHaveLength(0);
  });
});
