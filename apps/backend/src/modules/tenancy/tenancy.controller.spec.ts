import { HttpException, HttpStatus } from '@nestjs/common';
import { Result } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '@bancaflow/tenancy';
import type { GetBancaContextUseCase } from '@bancaflow/tenancy';
import type { AuthenticatedRequest } from '../../shared/types/authenticated-request.type';
import { TenancyController } from './tenancy.controller';

/**
 * Falha técnica (ex.: banco fora do ar) NUNCA pode virar `available: false`:
 * isso faria uma indisponibilidade de infraestrutura aparecer como "todo
 * tenant é inválido" e nunca acionaria o fail-open do `proxy.ts` (que só
 * trata erro de rede/resposta não-2xx). Só o código não enumerável
 * `TENANCY_ERRORS.BANCA_NOT_FOUND` vira `available: false`.
 */
describe('TenancyController', () => {
  function buildController(execute: jest.Mock): TenancyController {
    const useCase = { execute } as unknown as GetBancaContextUseCase;
    return new TenancyController(useCase);
  }

  function requestWithCodigo(
    codigoBanca: string | undefined,
  ): AuthenticatedRequest {
    return { codigoBanca } as AuthenticatedRequest;
  }

  it('sem codigoBanca resolvido (host reservado/inválido/fora do sufixo): available=false', async () => {
    const execute = jest.fn();
    const controller = buildController(execute);

    const res = await controller.tenantContext(requestWithCodigo(undefined));

    expect(res).toEqual({ available: false });
    expect(execute).not.toHaveBeenCalled();
  });

  it('banca ativa: available=true', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue(Result.ok({ bancaId: 'b1', isActive: true }));
    const controller = buildController(execute);

    const res = await controller.tenantContext(requestWithCodigo('farizeu'));

    expect(res).toEqual({ available: true });
  });

  it('banca inativa: available=false', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue(Result.ok({ bancaId: 'b1', isActive: false }));
    const controller = buildController(execute);

    const res = await controller.tenantContext(requestWithCodigo('farizeu'));

    expect(res).toEqual({ available: false });
  });

  it('banca não encontrada (código não enumerável): available=false', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue(Result.fail([TENANCY_ERRORS.BANCA_NOT_FOUND]));
    const controller = buildController(execute);

    const res = await controller.tenantContext(requestWithCodigo('nao-existe'));

    expect(res).toEqual({ available: false });
  });

  it('falha TÉCNICA (ex.: banco fora do ar) -> 500 genérico, NUNCA available=false', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue(Result.fail(['TENANCY_BANCA_FIND_ERROR']));
    const controller = buildController(execute);

    await expect(
      controller.tenantContext(requestWithCodigo('farizeu')),
    ).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('resposta de falha técnica não vaza código/mensagem interna', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue(Result.fail(['TENANCY_BANCA_FIND_ERROR']));
    const controller = buildController(execute);

    try {
      await controller.tenantContext(requestWithCodigo('farizeu'));
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const response = (e as HttpException).getResponse() as {
        message: string[];
      };
      expect(response.message).toEqual([
        'An unexpected error occurred. Please try again later.',
      ]);
      expect(JSON.stringify(response)).not.toContain(
        'TENANCY_BANCA_FIND_ERROR',
      );
    }
  });
});
