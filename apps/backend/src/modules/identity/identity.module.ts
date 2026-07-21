import {
  AdminCreateUserAccountUseCase,
  AdminListAccountSessionsUseCase,
  AdminResetPasswordUseCase,
  AdminRevokeAccountSessionUseCase,
  ChangeAccountRoleUseCase,
  ChangePasswordUseCase,
  CreateUserAccountUseCase,
  GetAuthenticatedUserContextUseCase,
  GetUserAccountUseCase,
  ListSessionsUseCase,
  ListUserAccountsUseCase,
  LoginUseCase,
  LogoutAllUseCase,
  LogoutUseCase,
  MandatoryPasswordChangeUseCase,
  RefreshSessionUseCase,
  RevokeSessionUseCase,
  ToggleAccountStatusUseCase,
  UpdateOwnProfileUseCase,
  UpdateUserAccountUseCase,
  type AccessTokenIssuer,
  type AuthenticatedUserAccountQuery,
  type BancaContextResolver,
  type BancaDisplayContextResolver,
  type Clock,
  type CreateUserAccountPort,
  type ListUserAccountsQuery,
  type PasswordCryptoProvider,
  type PermissionChecker,
  type RefreshTokenDigester,
  type RefreshTokenGenerator,
  type SessionRepository,
  type TemporaryPasswordGenerator,
  type UserAccountRepository,
} from '@bancaflow/identity';
import type { TransactionManager } from '@bancaflow/shared';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { PrismaService } from '../../db/prisma.service';
import { TenantResolverMiddleware } from '../../shared/middleware/tenant-resolver.middleware';
import { BancaContextResolver as BancaContextResolverAdapter } from '../tenancy/adapters/banca-context.resolver';
import { BancaDisplayContextResolver as BancaDisplayContextResolverAdapter } from '../tenancy/adapters/banca-display-context.resolver';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AccessControlPermissionChecker } from './adapters/access-control-permission-checker.adapter';
import { AuthenticatedUserAccountQueryPrisma } from './adapters/authenticated-user-account.query.prisma';
import { BcryptPasswordCryptoProvider } from './adapters/bcrypt-password-crypto.provider';
import { JwtAccessTokenIssuer } from './adapters/jwt-access-token.issuer';
import { ListUserAccountsQueryPrisma } from './adapters/list-user-accounts.query.prisma';
import { HmacRefreshTokenDigester } from './adapters/refresh-token.digester';
import { CryptoRefreshTokenGenerator } from './adapters/refresh-token.generator';
import { SessionRepositoryPrisma } from './adapters/session.repository.prisma';
import { SystemClockProvider } from './adapters/system-clock.provider';
import { CryptoTemporaryPasswordGenerator } from './adapters/temporary-password.generator';
import { UserAccountRepositoryPrisma } from './adapters/user-account.repository.prisma';
import { AccountsController } from './accounts.controller';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';
import { IdentityController } from './identity.controller';
import {
  ACCESS_TOKEN_ISSUER,
  ADMIN_CREATE_USER_ACCOUNT_USE_CASE,
  ADMIN_LIST_ACCOUNT_SESSIONS_USE_CASE,
  ADMIN_RESET_PASSWORD_USE_CASE,
  ADMIN_REVOKE_ACCOUNT_SESSION_USE_CASE,
  AUTHENTICATED_USER_ACCOUNT_QUERY,
  BANCA_CONTEXT_RESOLVER,
  BANCA_DISPLAY_CONTEXT_RESOLVER,
  CHANGE_ACCOUNT_ROLE_USE_CASE,
  CHANGE_PASSWORD_USE_CASE,
  CLOCK,
  CREATE_USER_ACCOUNT_USE_CASE,
  GET_AUTHENTICATED_USER_CONTEXT_USE_CASE,
  GET_USER_ACCOUNT_USE_CASE,
  LIST_SESSIONS_USE_CASE,
  LIST_USER_ACCOUNTS_QUERY,
  LIST_USER_ACCOUNTS_USE_CASE,
  LOGIN_USE_CASE,
  LOGOUT_ALL_USE_CASE,
  LOGOUT_USE_CASE,
  MANDATORY_PASSWORD_CHANGE_USE_CASE,
  PASSWORD_CRYPTO_PROVIDER,
  PERMISSION_CHECKER,
  REFRESH_SESSION_USE_CASE,
  REFRESH_TOKEN_DIGESTER,
  REFRESH_TOKEN_GENERATOR,
  REVOKE_SESSION_USE_CASE,
  SESSION_REPOSITORY,
  TEMPORARY_PASSWORD_GENERATOR,
  TOGGLE_ACCOUNT_STATUS_USE_CASE,
  TRANSACTION_MANAGER,
  UPDATE_OWN_PROFILE_USE_CASE,
  UPDATE_USER_ACCOUNT_USE_CASE,
  USER_ACCOUNT_REPOSITORY,
} from './identity.tokens';

@Module({
  imports: [DbModule, TenancyModule],
  controllers: [IdentityController, AccountsController],
  providers: [
    JwtCookieAuthGuard,

    // Adapters de saída atrás de tokens do domínio.
    { provide: USER_ACCOUNT_REPOSITORY, useClass: UserAccountRepositoryPrisma },
    { provide: SESSION_REPOSITORY, useClass: SessionRepositoryPrisma },
    {
      provide: PASSWORD_CRYPTO_PROVIDER,
      useClass: BcryptPasswordCryptoProvider,
    },
    { provide: ACCESS_TOKEN_ISSUER, useClass: JwtAccessTokenIssuer },
    { provide: REFRESH_TOKEN_GENERATOR, useClass: CryptoRefreshTokenGenerator },
    { provide: REFRESH_TOKEN_DIGESTER, useClass: HmacRefreshTokenDigester },
    {
      provide: TEMPORARY_PASSWORD_GENERATOR,
      useClass: CryptoTemporaryPasswordGenerator,
    },
    { provide: CLOCK, useClass: SystemClockProvider },
    { provide: TRANSACTION_MANAGER, useExisting: PrismaService },
    {
      provide: BANCA_CONTEXT_RESOLVER,
      useExisting: BancaContextResolverAdapter,
    },
    {
      provide: BANCA_DISPLAY_CONTEXT_RESOLVER,
      useExisting: BancaDisplayContextResolverAdapter,
    },
    {
      provide: AUTHENTICATED_USER_ACCOUNT_QUERY,
      useClass: AuthenticatedUserAccountQueryPrisma,
    },
    {
      provide: PERMISSION_CHECKER,
      useClass: AccessControlPermissionChecker,
    },
    {
      provide: LIST_USER_ACCOUNTS_QUERY,
      useClass: ListUserAccountsQueryPrisma,
    },

    // Casos de uso compostos.
    {
      provide: LOGIN_USE_CASE,
      useFactory: (
        resolver: BancaContextResolver,
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        crypto: PasswordCryptoProvider,
        refreshGen: RefreshTokenGenerator,
        digester: RefreshTokenDigester,
        issuer: AccessTokenIssuer,
        clock: Clock,
        tx: TransactionManager,
      ) =>
        new LoginUseCase(
          resolver,
          accounts,
          sessions,
          crypto,
          refreshGen,
          digester,
          issuer,
          clock,
          tx,
        ),
      inject: [
        BANCA_CONTEXT_RESOLVER,
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_CRYPTO_PROVIDER,
        REFRESH_TOKEN_GENERATOR,
        REFRESH_TOKEN_DIGESTER,
        ACCESS_TOKEN_ISSUER,
        CLOCK,
        TRANSACTION_MANAGER,
      ],
    },
    {
      provide: REFRESH_SESSION_USE_CASE,
      useFactory: (
        sessions: SessionRepository,
        accounts: UserAccountRepository,
        refreshGen: RefreshTokenGenerator,
        digester: RefreshTokenDigester,
        issuer: AccessTokenIssuer,
        clock: Clock,
        tx: TransactionManager,
      ) =>
        new RefreshSessionUseCase(
          sessions,
          accounts,
          refreshGen,
          digester,
          issuer,
          clock,
          tx,
        ),
      inject: [
        SESSION_REPOSITORY,
        USER_ACCOUNT_REPOSITORY,
        REFRESH_TOKEN_GENERATOR,
        REFRESH_TOKEN_DIGESTER,
        ACCESS_TOKEN_ISSUER,
        CLOCK,
        TRANSACTION_MANAGER,
      ],
    },
    {
      provide: LOGOUT_USE_CASE,
      useFactory: (sessions: SessionRepository, clock: Clock) =>
        new LogoutUseCase(sessions, clock),
      inject: [SESSION_REPOSITORY, CLOCK],
    },
    {
      provide: LOGOUT_ALL_USE_CASE,
      useFactory: (sessions: SessionRepository, clock: Clock) =>
        new LogoutAllUseCase(sessions, clock),
      inject: [SESSION_REPOSITORY, CLOCK],
    },
    {
      provide: LIST_SESSIONS_USE_CASE,
      useFactory: (sessions: SessionRepository) =>
        new ListSessionsUseCase(sessions),
      inject: [SESSION_REPOSITORY],
    },
    {
      provide: REVOKE_SESSION_USE_CASE,
      useFactory: (sessions: SessionRepository, clock: Clock) =>
        new RevokeSessionUseCase(sessions, clock),
      inject: [SESSION_REPOSITORY, CLOCK],
    },
    {
      provide: CHANGE_PASSWORD_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        crypto: PasswordCryptoProvider,
        issuer: AccessTokenIssuer,
        clock: Clock,
        tx: TransactionManager,
        permissions: PermissionChecker,
      ) =>
        new ChangePasswordUseCase(
          accounts,
          sessions,
          crypto,
          issuer,
          clock,
          tx,
          permissions,
        ),
      inject: [
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_CRYPTO_PROVIDER,
        ACCESS_TOKEN_ISSUER,
        CLOCK,
        TRANSACTION_MANAGER,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: MANDATORY_PASSWORD_CHANGE_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        crypto: PasswordCryptoProvider,
        issuer: AccessTokenIssuer,
        clock: Clock,
        tx: TransactionManager,
      ) =>
        new MandatoryPasswordChangeUseCase(
          accounts,
          sessions,
          crypto,
          issuer,
          clock,
          tx,
        ),
      inject: [
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_CRYPTO_PROVIDER,
        ACCESS_TOKEN_ISSUER,
        CLOCK,
        TRANSACTION_MANAGER,
      ],
    },
    {
      provide: ADMIN_RESET_PASSWORD_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        crypto: PasswordCryptoProvider,
        tempGen: TemporaryPasswordGenerator,
        clock: Clock,
        tx: TransactionManager,
        permissions: PermissionChecker,
      ) =>
        new AdminResetPasswordUseCase(
          accounts,
          sessions,
          crypto,
          tempGen,
          clock,
          tx,
          permissions,
        ),
      inject: [
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        PASSWORD_CRYPTO_PROVIDER,
        TEMPORARY_PASSWORD_GENERATOR,
        CLOCK,
        TRANSACTION_MANAGER,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: TOGGLE_ACCOUNT_STATUS_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        clock: Clock,
        tx: TransactionManager,
        permissions: PermissionChecker,
      ) =>
        new ToggleAccountStatusUseCase(
          accounts,
          sessions,
          clock,
          tx,
          permissions,
        ),
      inject: [
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        CLOCK,
        TRANSACTION_MANAGER,
        PERMISSION_CHECKER,
      ],
    },
    {
      // Port de entrada pública consumida pelo ProvisionBanca via
      // `PlatformProvisioningModule` (composition root externo, D10).
      provide: CREATE_USER_ACCOUNT_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        crypto: PasswordCryptoProvider,
        clock: Clock,
      ) => new CreateUserAccountUseCase(accounts, crypto, clock),
      inject: [USER_ACCOUNT_REPOSITORY, PASSWORD_CRYPTO_PROVIDER, CLOCK],
    },
    {
      provide: GET_AUTHENTICATED_USER_CONTEXT_USE_CASE,
      useFactory: (
        accounts: AuthenticatedUserAccountQuery,
        bancaDisplay: BancaDisplayContextResolver,
        permissions: PermissionChecker,
      ) =>
        new GetAuthenticatedUserContextUseCase(
          accounts,
          bancaDisplay,
          permissions,
        ),
      inject: [
        AUTHENTICATED_USER_ACCOUNT_QUERY,
        BANCA_DISPLAY_CONTEXT_RESOLVER,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: UPDATE_OWN_PROFILE_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        permissions: PermissionChecker,
      ) => new UpdateOwnProfileUseCase(accounts, permissions),
      inject: [USER_ACCOUNT_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: LIST_USER_ACCOUNTS_USE_CASE,
      useFactory: (
        query: ListUserAccountsQuery,
        permissions: PermissionChecker,
      ) => new ListUserAccountsUseCase(query, permissions),
      inject: [LIST_USER_ACCOUNTS_QUERY, PERMISSION_CHECKER],
    },
    {
      provide: GET_USER_ACCOUNT_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        permissions: PermissionChecker,
      ) => new GetUserAccountUseCase(accounts, permissions),
      inject: [USER_ACCOUNT_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: UPDATE_USER_ACCOUNT_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        permissions: PermissionChecker,
      ) => new UpdateUserAccountUseCase(accounts, permissions),
      inject: [USER_ACCOUNT_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: CHANGE_ACCOUNT_ROLE_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        clock: Clock,
        tx: TransactionManager,
        permissions: PermissionChecker,
      ) =>
        new ChangeAccountRoleUseCase(
          accounts,
          sessions,
          clock,
          tx,
          permissions,
        ),
      inject: [
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        CLOCK,
        TRANSACTION_MANAGER,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ADMIN_LIST_ACCOUNT_SESSIONS_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        permissions: PermissionChecker,
      ) => new AdminListAccountSessionsUseCase(accounts, sessions, permissions),
      inject: [USER_ACCOUNT_REPOSITORY, SESSION_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: ADMIN_REVOKE_ACCOUNT_SESSION_USE_CASE,
      useFactory: (
        accounts: UserAccountRepository,
        sessions: SessionRepository,
        clock: Clock,
        permissions: PermissionChecker,
      ) =>
        new AdminRevokeAccountSessionUseCase(
          accounts,
          sessions,
          clock,
          permissions,
        ),
      inject: [
        USER_ACCOUNT_REPOSITORY,
        SESSION_REPOSITORY,
        CLOCK,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ADMIN_CREATE_USER_ACCOUNT_USE_CASE,
      useFactory: (
        createUserAccount: CreateUserAccountPort,
        tempGen: TemporaryPasswordGenerator,
        permissions: PermissionChecker,
      ) =>
        new AdminCreateUserAccountUseCase(
          createUserAccount,
          tempGen,
          permissions,
        ),
      inject: [
        CREATE_USER_ACCOUNT_USE_CASE,
        TEMPORARY_PASSWORD_GENERATOR,
        PERMISSION_CHECKER,
      ],
    },
  ],
  exports: [
    CREATE_USER_ACCOUNT_USE_CASE,
    USER_ACCOUNT_REPOSITORY,
    SESSION_REPOSITORY,
    JwtCookieAuthGuard,
  ],
})
export class IdentityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // O `codigoBanca` é resolvido do host para o endpoint de login.
    consumer
      .apply(TenantResolverMiddleware)
      .forRoutes({ path: 'auth/login', method: RequestMethod.POST });
  }
}
