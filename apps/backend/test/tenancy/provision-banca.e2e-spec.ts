import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProvisionBancaUseCase } from '@bancaflow/tenancy';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/db/prisma.service';

const CODES = ['test-provision-ok', 'test-provision-rollback'];

/**
 * Prova que `ProvisionBanca` persiste Banca + conta OWNER na mesma transação
 * Prisma (via AsyncLocalStorage no `PrismaService`) e que uma falha na criação
 * da conta desfaz a criação da banca (D6).
 */
describe('ProvisionBanca (integration, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let provisionBanca: ProvisionBancaUseCase;

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
    provisionBanca = app.get(ProvisionBancaUseCase);

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('persiste Banca e conta OWNER na mesma transação', async () => {
    const result = await provisionBanca.execute({
      codigoBanca: 'test-provision-ok',
      nome: 'Test Provision OK',
      owner: {
        username: 'owner',
        name: 'Owner Silva',
        password: 'OwnerPass@123',
      },
    });

    expect(result.isOk).toBe(true);
    const { bancaId, userId } = result.instance;

    const banca = await prisma.client.banca.findUnique({
      where: { id: bancaId },
    });
    expect(banca).not.toBeNull();
    expect(banca?.codigoBanca).toBe('test-provision-ok');

    const account = await prisma.client.userAccount.findUnique({
      where: { id: userId },
    });
    expect(account).not.toBeNull();
    expect(account?.bancaId).toBe(bancaId);
    expect(account?.role).toBe('OWNER');
  });

  it('reverte a criação da banca quando a conta OWNER falha (rollback real)', async () => {
    // A banca é salva antes da conta dentro da transação; um username inválido
    // (rejeitado pelo VO `Username` do Identity) falha após a banca já ter sido
    // persistida no `tx`, exercitando o rollback real da transação Prisma.
    const result = await provisionBanca.execute({
      codigoBanca: 'test-provision-rollback',
      nome: 'Test Provision Rollback',
      owner: {
        username: '',
        name: 'Owner Silva',
        password: 'OwnerPass@123',
      },
    });

    expect(result.isFailure).toBe(true);

    const banca = await prisma.client.banca.findUnique({
      where: { codigoBanca: 'test-provision-rollback' },
    });
    expect(banca).toBeNull();

    const account = await prisma.client.userAccount.findFirst({
      where: { banca: { codigoBanca: 'test-provision-rollback' } },
    });
    expect(account).toBeNull();
  });
});
