import type {
  AdminCreateUserAccountUseCase,
  AdminListAccountSessionsUseCase,
  AdminRevokeAccountSessionUseCase,
  ChangeAccountRoleUseCase,
  GetUserAccountUseCase,
  ListUserAccountsUseCase,
  UpdateUserAccountUseCase,
} from '@bancaflow/identity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentBancaId,
  CurrentUser,
} from '../../shared/decorators/current-user.decorator';
import type { AuthContext } from '../../shared/types/jwt-payload.type';
import {
  ChangeAccountRoleDto,
  CreateUserAccountDto,
  ListUserAccountsDto,
  UpdateUserAccountDto,
} from './dto';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';
import { unwrapIdentityResult } from './identity-http.util';
import {
  ADMIN_CREATE_USER_ACCOUNT_USE_CASE,
  ADMIN_LIST_ACCOUNT_SESSIONS_USE_CASE,
  ADMIN_REVOKE_ACCOUNT_SESSION_USE_CASE,
  CHANGE_ACCOUNT_ROLE_USE_CASE,
  GET_USER_ACCOUNT_USE_CASE,
  LIST_USER_ACCOUNTS_USE_CASE,
  UPDATE_USER_ACCOUNT_USE_CASE,
} from './identity.tokens';

/**
 * Administração de contas `ADMIN`/`USER` da própria banca, exclusiva de
 * `OWNER` (autorização decidida por `PermissionKey` dentro de cada caso de
 * uso, nunca por checagem de papel bruto aqui). `bancaId` e `actorUserId`
 * vêm sempre do `AuthContext` (nunca do body/rota) — ver change
 * `enable-tenant-user-administration`.
 */
@Controller('accounts')
@UseGuards(JwtCookieAuthGuard)
export class AccountsController {
  constructor(
    @Inject(LIST_USER_ACCOUNTS_USE_CASE)
    private readonly listUserAccountsUseCase: ListUserAccountsUseCase,
    @Inject(GET_USER_ACCOUNT_USE_CASE)
    private readonly getUserAccountUseCase: GetUserAccountUseCase,
    @Inject(ADMIN_CREATE_USER_ACCOUNT_USE_CASE)
    private readonly adminCreateUserAccountUseCase: AdminCreateUserAccountUseCase,
    @Inject(UPDATE_USER_ACCOUNT_USE_CASE)
    private readonly updateUserAccountUseCase: UpdateUserAccountUseCase,
    @Inject(CHANGE_ACCOUNT_ROLE_USE_CASE)
    private readonly changeAccountRoleUseCase: ChangeAccountRoleUseCase,
    @Inject(ADMIN_LIST_ACCOUNT_SESSIONS_USE_CASE)
    private readonly adminListAccountSessionsUseCase: AdminListAccountSessionsUseCase,
    @Inject(ADMIN_REVOKE_ACCOUNT_SESSION_USE_CASE)
    private readonly adminRevokeAccountSessionUseCase: AdminRevokeAccountSessionUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Query() query: ListUserAccountsDto,
  ) {
    return unwrapIdentityResult(
      await this.listUserAccountsUseCase.execute({
        bancaId,
        actorRole: user.role,
        pagination: { page: query.page, pageSize: query.pageSize },
        search: query.search,
        role: query.role,
        status: query.status,
      }),
    );
  }

  @Get(':accountId')
  async detail(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('accountId') accountId: string,
  ) {
    return unwrapIdentityResult(
      await this.getUserAccountUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: accountId,
      }),
    );
  }

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Body() body: CreateUserAccountDto,
  ) {
    return unwrapIdentityResult(
      await this.adminCreateUserAccountUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        username: body.username,
        name: body.name,
        email: body.email,
        role: body.role,
      }),
    );
  }

  @Patch(':accountId')
  async update(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('accountId') accountId: string,
    @Body() body: UpdateUserAccountDto,
  ) {
    return unwrapIdentityResult(
      await this.updateUserAccountUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: accountId,
        expectedVersion: body.version,
        username: body.username,
        name: body.name,
        email: body.email,
      }),
    );
  }

  @Patch(':accountId/role')
  async changeRole(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('accountId') accountId: string,
    @Body() body: ChangeAccountRoleDto,
  ) {
    return unwrapIdentityResult(
      await this.changeAccountRoleUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: accountId,
        role: body.role,
      }),
    );
  }

  @Get(':accountId/sessions')
  async listSessions(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('accountId') accountId: string,
  ) {
    return unwrapIdentityResult(
      await this.adminListAccountSessionsUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: accountId,
      }),
    );
  }

  @Delete(':accountId/sessions/:sessionId')
  async revokeSession(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('accountId') accountId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return unwrapIdentityResult(
      await this.adminRevokeAccountSessionUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: accountId,
        sessionId,
      }),
    );
  }
}
