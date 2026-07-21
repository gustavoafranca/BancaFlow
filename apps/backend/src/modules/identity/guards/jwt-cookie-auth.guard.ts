import type {
  SessionRepository,
  UserAccountRepository,
} from '@bancaflow/identity';
import { IDENTITY_ERRORS } from '@bancaflow/identity';
import type { BancaRepository } from '@bancaflow/tenancy';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { mapPayloadToAuthContext } from '../../../shared/auth/auth-user.mapper';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/auth/jwt.strategy';
import { logTechnicalFailure } from '../../../shared/errors/prisma-error.util';
import { GENERIC_INTERNAL_ERROR_MESSAGE } from '../../../shared/errors/technical-error-codes';
import type { AuthenticatedRequest } from '../../../shared/types/authenticated-request.type';
import type { JwtPayload } from '../../../shared/types/jwt-payload.type';
import { BANCA_REPOSITORY } from '../../tenancy/tenancy.module';
import {
  SESSION_REPOSITORY,
  USER_ACCOUNT_REPOSITORY,
} from '../identity.tokens';
import { ALLOW_PASSWORD_CHANGE } from './allow-password-change.decorator';

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly accounts: UserAccountRepository,
    @Inject(BANCA_REPOSITORY) private readonly bancas: BancaRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = (request as { cookies?: Record<string, string> }).cookies;
    const token = cookies?.[ACCESS_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'IDENTITY.JWT_SECRET_NOT_CONFIGURED',
      );
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    const session = await this.sessions.findById(
      payload.sessionId,
      payload.bancaId,
    );
    if (session.isFailure) {
      throw this.technicalFailure('SessionRepository.findById', session.errors);
    }
    if (
      !session.instance ||
      session.instance.isRevoked() ||
      session.instance.isExpired(new Date())
    ) {
      throw new UnauthorizedException(IDENTITY_ERRORS.SESSION_REVOKED);
    }

    const account = await this.accounts.findById(payload.sub, payload.bancaId);
    if (account.isFailure) {
      throw this.technicalFailure(
        'UserAccountRepository.findById',
        account.errors,
      );
    }
    if (!account.instance || !account.instance.isActive()) {
      throw new UnauthorizedException(IDENTITY_ERRORS.ACCOUNT_INACTIVE);
    }

    const banca = await this.bancas.findById(payload.bancaId);
    if (banca.isFailure) {
      throw this.technicalFailure('BancaRepository.findById', banca.errors);
    }
    if (!banca.instance || !banca.instance.status.isActive) {
      throw new UnauthorizedException(IDENTITY_ERRORS.BANCA_INACTIVE);
    }

    const authUser = mapPayloadToAuthContext(payload);
    request.authUser = authUser;

    const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE,
      [context.getHandler(), context.getClass()],
    );
    if (authUser.mustChangePassword && !allowPasswordChange) {
      throw new ForbiddenException(IDENTITY_ERRORS.MUST_CHANGE_PASSWORD);
    }

    return true;
  }

  private technicalFailure(
    operation: string,
    codes?: string[],
  ): InternalServerErrorException {
    logTechnicalFailure(undefined, {
      scope: 'JwtCookieAuthGuard',
      operation,
      codes,
    });
    return new InternalServerErrorException(GENERIC_INTERNAL_ERROR_MESSAGE);
  }
}
