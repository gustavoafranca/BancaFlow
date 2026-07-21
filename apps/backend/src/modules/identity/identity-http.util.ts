import { IDENTITY_ERRORS } from '@bancaflow/identity';
import type { Result } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '@bancaflow/tenancy';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  GENERIC_INTERNAL_ERROR_MESSAGE,
  isTechnicalFailureCode,
} from '../../shared/errors/technical-error-codes';

/**
 * Mapeamento único código de domínio → status HTTP, compartilhado por
 * `IdentityController` e `AccountsController`. `403` é reservado para falta
 * de `PermissionKey`; `404` (`ACCOUNT_NOT_FOUND`/`TARGET_SESSION_NOT_FOUND`)
 * é reservado para alvo inexistente ou de outra banca — nunca o contrário
 * (ver `design.md` D11 da change `enable-tenant-user-administration`).
 */
export const IDENTITY_STATUS_BY_CODE: Record<string, number> = {
  [IDENTITY_ERRORS.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [IDENTITY_ERRORS.SESSION_NOT_FOUND]: HttpStatus.UNAUTHORIZED,
  [IDENTITY_ERRORS.SESSION_REVOKED]: HttpStatus.UNAUTHORIZED,
  [IDENTITY_ERRORS.ACCOUNT_LOCKED]: HttpStatus.LOCKED,
  [IDENTITY_ERRORS.ACCOUNT_INACTIVE]: HttpStatus.UNAUTHORIZED,
  [IDENTITY_ERRORS.MUST_CHANGE_PASSWORD]: HttpStatus.FORBIDDEN,
  [IDENTITY_ERRORS.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [IDENTITY_ERRORS.ACCOUNT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [IDENTITY_ERRORS.BANCA_NOT_FOUND]: HttpStatus.UNAUTHORIZED,
  [IDENTITY_ERRORS.BANCA_INACTIVE]: HttpStatus.UNAUTHORIZED,
  [IDENTITY_ERRORS.PASSWORD_TOO_WEAK]: HttpStatus.UNPROCESSABLE_ENTITY,
  [IDENTITY_ERRORS.INVALID_FAILED_LOGIN_ATTEMPTS]: HttpStatus.BAD_REQUEST,
  [TENANCY_ERRORS.NOME_INVALID]: HttpStatus.BAD_REQUEST,
  [IDENTITY_ERRORS.CONCURRENCY_CONFLICT]: HttpStatus.CONFLICT,
  [IDENTITY_ERRORS.CURRENT_PASSWORD_INCORRECT]: HttpStatus.BAD_REQUEST,
  [IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND]: HttpStatus.NOT_FOUND,
};

/** Desembrulha um `Result<T>`, lançando `HttpException` com o status mapeado em caso de falha. */
export function unwrapIdentityResult<T>(result: Result<T>): T {
  if (result.isFailure) {
    const code = result.errors?.[0] ?? IDENTITY_ERRORS.INVALID_CREDENTIALS;
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

    const status = IDENTITY_STATUS_BY_CODE[code] ?? HttpStatus.BAD_REQUEST;
    throw new HttpException(
      { statusCode: status, error: 'Identity Error', code, message: [code] },
      status,
    );
  }
  return result.instance;
}
