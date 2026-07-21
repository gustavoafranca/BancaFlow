import { IDENTITY_ERRORS, UserAccount } from '@bancaflow/identity';
import { Id } from '@bancaflow/shared';
import type { PrismaService } from '../../../db/prisma.service';
import { UserAccountRepositoryPrisma } from './user-account.repository.prisma';

/**
 * Prova determinística da proteção de concorrência otimista no adapter Prisma
 * (P2.2 da revisão): `save()` deve retornar `IDENTITY_ERRORS.CONCURRENCY_CONFLICT`
 * quando `updateMany({ where: { id, version } })` afeta zero linhas — ou seja,
 * quando outra escrita já mudou a versão persistida entre a leitura e esta
 * escrita. Diferente do teste e2e de corrida (`update-own-profile.e2e-spec.ts`,
 * que dispara duas requisições HTTP concorrentes e não garante qual delas
 * chega ao CAS do Prisma vs. à checagem antecipada do caso de uso), este teste
 * mocka o cliente Prisma diretamente e força `count: 0` — exercitando o `save()`
 * do adapter sem depender de timing de nenhuma corrida real.
 */
type FindUnique = jest.Mock;
type UpdateMany = jest.Mock;
type Create = jest.Mock;

function buildPrisma(mocks: {
  findUnique: FindUnique;
  updateMany?: UpdateMany;
  create?: Create;
}): PrismaService {
  return {
    activeClient: () => ({
      userAccount: {
        findUnique: mocks.findUnique,
        updateMany: mocks.updateMany ?? jest.fn(),
        create: mocks.create ?? jest.fn(),
      },
    }),
    // Força `save()` a chamar `persist()` diretamente com o `activeClient()`
    // acima, sem precisar mockar `runInTransactionResult`.
    isInTransaction: () => true,
  } as unknown as PrismaService;
}

const BASE = new Date('2026-07-15T12:00:00.000Z');

function buildAccount(version: number): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: Id.createUUID(),
    username: 'joao',
    name: 'Joao Silva',
    email: 'joao@example.com',
    role: 'USER',
    status: 'ACTIVE',
    credential: {
      passwordHash: 'hashed-password',
      passwordChangedAt: BASE,
      mustChangePassword: false,
    },
    failedLoginAttempts: 0,
    version,
  });
}

describe('UserAccountRepositoryPrisma — CAS de concorrência otimista (save)', () => {
  it('retorna IDENTITY_ERRORS.CONCURRENCY_CONFLICT quando updateMany afeta 0 linhas (version desatualizado na escrita)', async () => {
    const account = buildAccount(3);
    const findUnique = jest.fn().mockResolvedValue({ id: account.id });
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const repo = new UserAccountRepositoryPrisma(
      buildPrisma({ findUnique, updateMany }),
    );

    const result = await repo.save(account);

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
    // Prova que o CAS filtra exatamente por id + version lido pela entidade.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: account.id, version: 3 } }),
    );
  });

  it('persiste com sucesso quando updateMany afeta 1 linha (version ainda corresponde ao persistido) — regressão', async () => {
    const account = buildAccount(3);
    const findUnique = jest.fn().mockResolvedValue({ id: account.id });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const repo = new UserAccountRepositoryPrisma(
      buildPrisma({ findUnique, updateMany }),
    );

    const result = await repo.save(account);

    expect(result.isOk).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: account.id, version: 3 } }),
    );
  });

  it('cria a conta (version 1) quando ainda não existe — não passa pelo CAS de update', async () => {
    const account = buildAccount(1);
    const findUnique = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue(undefined);
    const updateMany = jest.fn();
    const repo = new UserAccountRepositoryPrisma(
      buildPrisma({ findUnique, updateMany, create }),
    );

    const result = await repo.save(account);

    expect(result.isOk).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
