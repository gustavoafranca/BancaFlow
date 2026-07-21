import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { GetBancaContextUseCase, TENANCY_ERRORS } from '@bancaflow/tenancy';
import type { AuthenticatedRequest } from '../../shared/types/authenticated-request.type';
import { GENERIC_INTERNAL_ERROR_MESSAGE } from '../../shared/errors/technical-error-codes';

export interface TenantContextResponse {
  available: boolean;
}

/**
 * Endpoint público (sem guard) e deliberadamente não enumerável (D6 do
 * design.md de `review-web-frontend-architecture`): host reservado/inválido
 * e banca inexistente/inativa retornam a MESMA resposta (`{ available: false
 * }`) com o mesmo HTTP 200 — nunca 404/401 — para que o Next
 * (`app/unavailable`) não consiga distinguir "não existe" de "inativa".
 * `codigoBanca` já vem resolvido pelo `TenantResolverMiddleware` (mesma
 * fronteira de confiança de `Host`/`X-Forwarded-Host` do login).
 *
 * Falha TÉCNICA (ex.: banco fora do ar) é DIFERENTE de "tenant não
 * encontrado": `GetBancaContextUseCase`/`BancaRepositoryPrisma` propagam um
 * código de erro distinto de `TENANCY_ERRORS.BANCA_NOT_FOUND` nesse caso (ver
 * `safeErrorCode` em `banca.repository.prisma.ts`). Colapsar os dois em
 * `available: false` faria uma indisponibilidade de infraestrutura aparecer
 * como "todo host é inválido" — e nunca acionaria o fail-open do
 * `proxy.ts` (que só trata erro de rede/resposta não-2xx). Por isso falha
 * técnica aqui vira `500` genérico simétrico ao resto do Identity/Tenancy,
 * nunca `available: false`.
 */
@Controller()
export class TenancyController {
  constructor(private readonly getBancaContext: GetBancaContextUseCase) {}

  @Get('tenant-context')
  @UseGuards(ThrottlerGuard)
  @Throttle({ 'tenant-context': { limit: 30, ttl: 10_000 } })
  async tenantContext(
    @Req() req: AuthenticatedRequest,
  ): Promise<TenantContextResponse> {
    const codigo = req.codigoBanca;
    if (!codigo) {
      return { available: false };
    }

    const result = await this.getBancaContext.execute({ codigoBanca: codigo });
    if (result.isFailure) {
      const code = result.errors?.[0];
      if (code !== TENANCY_ERRORS.BANCA_NOT_FOUND) {
        throw new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Error',
            message: [GENERIC_INTERNAL_ERROR_MESSAGE],
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return { available: false };
    }

    return { available: result.instance.isActive };
  }
}
