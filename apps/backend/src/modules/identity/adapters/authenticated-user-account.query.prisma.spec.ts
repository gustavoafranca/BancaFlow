import type { PrismaService } from '../../../db/prisma.service';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { AuthenticatedUserAccountQueryPrisma } from './authenticated-user-account.query.prisma';

type FindFirst = jest.Mock;

function buildPrisma(findFirst: FindFirst): PrismaService {
  return {
    activeClient: () => ({ userAccount: { findFirst } }),
  } as unknown as PrismaService;
}

const ROW = {
  id: 'user-1',
  bancaId: 'banca-1',
  username: 'joao',
  name: 'João Silva',
  email: 'joao@banca.com',
  role: 'ADMIN',
  version: 3,
};

describe('AuthenticatedUserAccountQueryPrisma', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  it('projeta a conta ativa por userId+bancaId (status=ACTIVE, sem entidade/campos internos)', async () => {
    const findFirst: FindFirst = jest.fn().mockResolvedValue(ROW);
    const query = new AuthenticatedUserAccountQueryPrisma(
      buildPrisma(findFirst),
    );

    const result = await query.findByUserAndBanca('user-1', 'banca-1');

    expect(result.isOk).toBe(true);
    expect(result.instance).toEqual({
      userId: 'user-1',
      bancaId: 'banca-1',
      username: 'joao',
      name: 'João Silva',
      email: 'joao@banca.com',
      role: 'ADMIN',
      version: 3,
    });
    // Escopo e filtro de estado corretos + projeção explícita (select).
    const calls = findFirst.mock.calls as Array<
      [{ where: unknown; select: unknown }]
    >;
    const args = calls[0][0];
    expect(args.where).toEqual({
      id: 'user-1',
      bancaId: 'banca-1',
      status: 'ACTIVE',
    });
    expect(args.select).toEqual({
      id: true,
      bancaId: true,
      username: true,
      name: true,
      email: true,
      role: true,
      version: true,
    });
  });

  it('e-mail ausente vira null', async () => {
    const findFirst: FindFirst = jest
      .fn()
      .mockResolvedValue({ ...ROW, email: null });
    const query = new AuthenticatedUserAccountQueryPrisma(
      buildPrisma(findFirst),
    );
    const result = await query.findByUserAndBanca('user-1', 'banca-1');
    expect(result.instance!.email).toBeNull();
  });

  it('ausência (conta inexistente/inativa/outra banca) → Result.ok(null), não falha', async () => {
    const findFirst: FindFirst = jest.fn().mockResolvedValue(null);
    const query = new AuthenticatedUserAccountQueryPrisma(
      buildPrisma(findFirst),
    );
    const result = await query.findByUserAndBanca('user-x', 'banca-1');
    expect(result.isOk).toBe(true);
    expect(result.instance).toBeNull();
  });

  it('falha técnica (exceção Prisma) → Result.fail com código técnico, causa só em log interno', async () => {
    const cause = new Error('connection refused (ECONNREFUSED)');
    const findFirst: FindFirst = jest.fn().mockRejectedValue(cause);
    const query = new AuthenticatedUserAccountQueryPrisma(
      buildPrisma(findFirst),
    );

    const result = await query.findByUserAndBanca('user-1', 'banca-1');

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(
      TECHNICAL_ERROR_CODES.IDENTITY_USER_ACCOUNT_QUERY,
    );
    // A causa é registrada internamente como log ESTRUTURADO e SANITIZADO:
    // código técnico + operação, sem o objeto/mensagem bruta do erro.
    const logCalls = consoleError.mock.calls as unknown[][];
    const logged = String(logCalls[0]?.[0]);
    expect(logged).toContain(TECHNICAL_ERROR_CODES.IDENTITY_USER_ACCOUNT_QUERY);
    expect(logged).toContain(
      'AuthenticatedUserAccountQueryPrisma.findByUserAndBanca',
    );
    expect(logged).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(result.errors)).not.toContain('ECONNREFUSED');
  });
});
