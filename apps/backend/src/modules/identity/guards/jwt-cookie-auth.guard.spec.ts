import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { Result } from '@bancaflow/shared';
import type {
  SessionRepository,
  UserAccountRepository,
} from '@bancaflow/identity';
import type { BancaRepository } from '@bancaflow/tenancy';
import { JwtCookieAuthGuard } from './jwt-cookie-auth.guard';

type FakeSession = {
  isRevoked: () => boolean;
  isExpired: (now: Date) => boolean;
};
type FakeAccount = { isActive: () => boolean };
type FakeBanca = { status: { isActive: boolean } };

function buildContext(cookies: Record<string, string>): ExecutionContext {
  const request = { cookies };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}) as unknown,
    getClass: () => ({}) as unknown,
  } as unknown as ExecutionContext;
}

const PAYLOAD = {
  sub: 'user-1',
  bancaId: 'banca-1',
  sessionId: 'session-1',
  role: 'OWNER' as const,
  mustChangePassword: false,
};

function buildGuard(overrides: {
  session?: FakeSession | null;
  account?: FakeAccount | null;
  banca?: FakeBanca | null;
  sessionFail?: boolean;
  accountFail?: boolean;
  bancaFail?: boolean;
  allowPasswordChange?: boolean;
  mustChangePassword?: boolean;
}) {
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue({
      ...PAYLOAD,
      mustChangePassword: overrides.mustChangePassword ?? false,
    }),
  };
  const config = {
    get: jest.fn().mockReturnValue('a-strong-enough-secret-value-1234'),
  };
  const reflector = {
    getAllAndOverride: jest
      .fn()
      .mockReturnValue(overrides.allowPasswordChange ?? false),
  };
  const sessions = {
    findById: jest.fn().mockResolvedValue(
      overrides.sessionFail
        ? Result.fail('IDENTITY.SESSION_QUERY_ERROR')
        : overrides.session === null
          ? Result.ok(null)
          : Result.ok(
              overrides.session ?? {
                isRevoked: () => false,
                isExpired: () => false,
              },
            ),
    ),
  };
  const accounts = {
    findById: jest
      .fn()
      .mockResolvedValue(
        overrides.accountFail
          ? Result.fail('IDENTITY.USER_ACCOUNT_QUERY_ERROR')
          : overrides.account === null
            ? Result.ok(null)
            : Result.ok(overrides.account ?? { isActive: () => true }),
      ),
  };
  const bancas = {
    findById: jest
      .fn()
      .mockResolvedValue(
        overrides.bancaFail
          ? Result.fail('TENANCY.BANCA_QUERY_ERROR')
          : overrides.banca === null
            ? Result.ok(null)
            : Result.ok(overrides.banca ?? { status: { isActive: true } }),
      ),
  };

  const guard = new JwtCookieAuthGuard(
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    reflector as unknown as Reflector,
    sessions as unknown as SessionRepository,
    accounts as unknown as UserAccountRepository,
    bancas as unknown as BancaRepository,
  );
  return { guard, sessions, accounts, bancas, jwt };
}

describe('JwtCookieAuthGuard', () => {
  it('rejeita quando não há cookie de access token', async () => {
    const { guard } = buildGuard({});
    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('permite quando token, sessão, conta e banca estão todos válidos', async () => {
    const { guard } = buildGuard({});
    const ctx = buildContext({ access_token: 'token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejeita quando a sessão está revogada', async () => {
    const { guard } = buildGuard({
      session: { isRevoked: () => true, isExpired: () => false },
    });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita quando a sessão está expirada', async () => {
    const { guard } = buildGuard({
      session: { isRevoked: () => false, isExpired: () => true },
    });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita quando a conta não existe mais (isolamento/consistência)', async () => {
    const { guard } = buildGuard({ account: null });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita quando a conta está BLOCKED/INACTIVE mesmo com token e sessão válidos', async () => {
    const { guard } = buildGuard({ account: { isActive: () => false } });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita quando a banca não existe mais', async () => {
    const { guard } = buildGuard({ banca: null });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita quando a banca está INACTIVE mesmo com sessão/conta válidas', async () => {
    const { guard } = buildGuard({ banca: { status: { isActive: false } } });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  // --- Categoria C: falha TÉCNICA de repository → 500, nunca 401 de estado ---

  describe('falhas técnicas de repository viram 500 (não 401)', () => {
    let consoleError: jest.SpyInstance;
    beforeEach(() => {
      consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
    });
    afterEach(() => consoleError.mockRestore());

    it('falha técnica ao ler a sessão → 500, não SESSION_REVOKED', async () => {
      const { guard } = buildGuard({ sessionFail: true });
      const promise = guard.canActivate(
        buildContext({ access_token: 'token' }),
      );
      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.not.toThrow(UnauthorizedException);
    });

    it('falha técnica ao ler a conta → 500, não ACCOUNT_INACTIVE', async () => {
      const { guard } = buildGuard({ accountFail: true });
      const promise = guard.canActivate(
        buildContext({ access_token: 'token' }),
      );
      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.not.toThrow(UnauthorizedException);
    });

    it('falha técnica ao ler a banca → 500, não BANCA_INACTIVE', async () => {
      const { guard } = buildGuard({ bancaFail: true });
      const promise = guard.canActivate(
        buildContext({ access_token: 'token' }),
      );
      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.not.toThrow(UnauthorizedException);
    });

    it('a resposta técnica é genérica e o log não vaza detalhe ao cliente', async () => {
      const { guard } = buildGuard({ accountFail: true });
      await expect(
        guard.canActivate(buildContext({ access_token: 'token' })),
      ).rejects.toMatchObject({
        message: 'An unexpected error occurred. Please try again later.',
      });
      // A causa/contexto é registrada internamente (log estruturado seguro).
      expect(consoleError).toHaveBeenCalled();
    });
  });

  it('bloqueia rotas protegidas quando mustChangePassword=true e a rota não permite', async () => {
    const { guard } = buildGuard({
      mustChangePassword: true,
      allowPasswordChange: false,
    });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite rotas com @AllowPasswordChange mesmo com mustChangePassword=true', async () => {
    const { guard } = buildGuard({
      mustChangePassword: true,
      allowPasswordChange: true,
    });
    await expect(
      guard.canActivate(buildContext({ access_token: 'token' })),
    ).resolves.toBe(true);
  });
});
