import { Result } from '@bancaflow/shared';
import { PrismaService } from './prisma.service';

/**
 * Testa a semântica de `runInTransactionResult` isoladamente, sem banco real:
 * substitui `client.$transaction` por um fake que apenas invoca o callback
 * passando um "tx client" fictício — o que importa aqui é o contrato de
 * commit/rollback baseado em `Result`, não o driver Postgres em si (isso é
 * coberto pelos testes de integração em `test/identity/transaction.e2e-spec.ts`).
 */
describe('PrismaService.runInTransactionResult', () => {
  let service: PrismaService;
  const fakeTxClient = { fake: true };

  beforeEach(() => {
    service = new PrismaService();
    // Substitui o `$transaction` real por um fake síncrono-o-suficiente que
    // apenas invoca o callback com um tx client fictício, propagando
    // resoluções/rejeições — não conecta a nenhum banco.
    (service.client as unknown as { $transaction: unknown }).$transaction = (
      callback: (tx: unknown) => Promise<unknown>,
    ) => callback(fakeTxClient);
  });

  it('confirma (retorna o próprio Result.ok) quando o callback tem sucesso', async () => {
    const result = await service.runInTransactionResult(() =>
      Promise.resolve(Result.ok('valor-persistido')),
    );
    expect(result.isOk).toBe(true);
    expect(result.instance).toBe('valor-persistido');
  });

  it('reverte e retorna Result.fail (sem propagar exceção) quando o callback retorna Result.fail', async () => {
    const result = await service.runInTransactionResult(() =>
      Promise.resolve(Result.fail<string>('DOMAIN.SIMULATED_FAILURE')),
    );
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(['DOMAIN.SIMULATED_FAILURE']);
  });

  it('propaga exceções reais (não sentinelas) sem convertê-las em Result.fail', async () => {
    await expect(
      service.runInTransactionResult(() => {
        throw new Error('erro real de infraestrutura');
      }),
    ).rejects.toThrow('erro real de infraestrutura');
  });

  it('expõe o mesmo tx client ativo dentro do callback via activeClient()', async () => {
    let observed: unknown;
    await service.runInTransactionResult(() => {
      observed = service.activeClient();
      return Promise.resolve(Result.ok(undefined));
    });
    expect(observed).toBe(fakeTxClient);
  });

  it('isInTransaction() é false fora de qualquer transação e true durante o callback', async () => {
    expect(service.isInTransaction()).toBe(false);
    let observed = false;
    await service.runInTransactionResult(() => {
      observed = service.isInTransaction();
      return Promise.resolve(Result.ok(undefined));
    });
    expect(observed).toBe(true);
    expect(service.isInTransaction()).toBe(false);
  });
});
