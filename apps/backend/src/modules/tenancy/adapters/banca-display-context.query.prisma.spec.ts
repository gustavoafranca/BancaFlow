import type { PrismaService } from '../../../db/prisma.service';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { BancaDisplayContextQueryPrisma } from './banca-display-context.query.prisma';

type FindFirst = jest.Mock;

function buildPrisma(findFirst: FindFirst): PrismaService {
  return {
    activeClient: () => ({ banca: { findFirst } }),
  } as unknown as PrismaService;
}

const ROW = { id: 'banca-1', codigoBanca: 'farizeu', nome: 'Banca São Jorge' };

describe('BancaDisplayContextQueryPrisma', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  it('projeta banca ATIVA por id ({ bancaId, codigoBanca, nome }, sem entidade/status)', async () => {
    const findFirst: FindFirst = jest.fn().mockResolvedValue(ROW);
    const query = new BancaDisplayContextQueryPrisma(buildPrisma(findFirst));

    const result = await query.findActiveById('banca-1');

    expect(result.isOk).toBe(true);
    expect(result.instance).toEqual({
      bancaId: 'banca-1',
      codigoBanca: 'farizeu',
      nome: 'Banca São Jorge',
    });
    const calls = findFirst.mock.calls as Array<
      [{ where: unknown; select: unknown }]
    >;
    const args = calls[0][0];
    expect(args.where).toEqual({ id: 'banca-1', status: 'ACTIVE' });
    expect(args.select).toEqual({ id: true, codigoBanca: true, nome: true });
  });

  it('banca inexistente/inativa → Result.ok(null), não falha', async () => {
    const findFirst: FindFirst = jest.fn().mockResolvedValue(null);
    const query = new BancaDisplayContextQueryPrisma(buildPrisma(findFirst));
    const result = await query.findActiveById('banca-x');
    expect(result.isOk).toBe(true);
    expect(result.instance).toBeNull();
  });

  it('falha técnica (exceção Prisma) → Result.fail técnico e NÃO ausência; causa só em log', async () => {
    const cause = new Error('pool timeout');
    const findFirst: FindFirst = jest.fn().mockRejectedValue(cause);
    const query = new BancaDisplayContextQueryPrisma(buildPrisma(findFirst));

    const result = await query.findActiveById('banca-1');

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(
      TECHNICAL_ERROR_CODES.TENANCY_BANCA_DISPLAY_QUERY,
    );
    // Falha técnica não é colapsada em ausência (que seria Result.ok(null)).
    expect(result.instance).toBeUndefined();
    // Log ESTRUTURADO e SANITIZADO: código técnico + operação, sem a mensagem bruta.
    const logCalls = consoleError.mock.calls as unknown[][];
    const logged = String(logCalls[0]?.[0]);
    expect(logged).toContain(TECHNICAL_ERROR_CODES.TENANCY_BANCA_DISPLAY_QUERY);
    expect(logged).toContain('BancaDisplayContextQueryPrisma.findActiveById');
    expect(logged).not.toContain('pool timeout');
    expect(JSON.stringify(result.errors)).not.toContain('pool timeout');
  });
});
