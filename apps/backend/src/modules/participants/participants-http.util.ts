import { PARTICIPANTS_ERRORS } from '@bancaflow/participants';
import type { Result } from '@bancaflow/shared';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  GENERIC_INTERNAL_ERROR_MESSAGE,
  isTechnicalFailureCode,
} from '../../shared/errors/technical-error-codes';

/**
 * Mapa único código de domínio → status HTTP. `403` é reservado para falta de
 * `PermissionKey` (`FORBIDDEN`); `404` para alvo inexistente ou de outra Banca
 * (`BETTING_AGENT_NOT_FOUND`), nunca o contrário; `409` para conflito de código
 * (`CODE_ALREADY_EXISTS`) e possível duplicidade (`POSSIBLE_DUPLICATE`); demais
 * validações de domínio → `400`.
 */
export const PARTICIPANTS_STATUS_BY_CODE: Record<string, number> = {
  [PARTICIPANTS_ERRORS.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [PARTICIPANTS_ERRORS.CODE_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [PARTICIPANTS_ERRORS.POSSIBLE_DUPLICATE]: HttpStatus.CONFLICT,
  [PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [PARTICIPANTS_ERRORS.INVALID_POLICY]: HttpStatus.BAD_REQUEST,
  [PARTICIPANTS_ERRORS.INVALID_ADDRESS]: HttpStatus.BAD_REQUEST,
  [PARTICIPANTS_ERRORS.INVALID_CODE]: HttpStatus.BAD_REQUEST,
  [PARTICIPANTS_ERRORS.INVALID_PHONE]: HttpStatus.BAD_REQUEST,
  [PARTICIPANTS_ERRORS.INVALID_PARTY_TYPE]: HttpStatus.BAD_REQUEST,
  [PARTICIPANTS_ERRORS.PARTY_ALREADY_HAS_AGENT]: HttpStatus.CONFLICT,
};

/**
 * Desembrulha um `Result<T>`, lançando `HttpException` com o status mapeado em
 * caso de falha. Falha técnica (categoria C) vira `500` genérico, sem vazar
 * código interno, mensagem, stack ou detalhe do banco.
 */
export function unwrapParticipantsResult<T>(result: Result<T>): T {
  if (result.isFailure) {
    const code = result.errors?.[0] ?? PARTICIPANTS_ERRORS.INVALID_CODE;
    if (isTechnicalFailureCode(code)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Error',
          message: [GENERIC_INTERNAL_ERROR_MESSAGE],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const status = PARTICIPANTS_STATUS_BY_CODE[code] ?? HttpStatus.BAD_REQUEST;
    throw new HttpException(
      {
        statusCode: status,
        error: 'Participants Error',
        code,
        message: [code],
      },
      status,
    );
  }
  return result.instance;
}
