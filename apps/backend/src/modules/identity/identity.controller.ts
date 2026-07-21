import type {
  AdminResetPasswordUseCase,
  AuthResultDto,
  ChangePasswordUseCase,
  GetAuthenticatedUserContextUseCase,
  ListSessionsUseCase,
  LoginUseCase,
  LogoutAllUseCase,
  LogoutUseCase,
  MandatoryPasswordChangeUseCase,
  RefreshSessionUseCase,
  RevokeSessionUseCase,
  ToggleAccountStatusUseCase,
  UpdateOwnProfileUseCase,
} from '@bancaflow/identity';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  CurrentBancaId,
  CurrentUser,
} from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedRequest } from '../../shared/types/authenticated-request.type';
import type { AuthContext } from '../../shared/types/jwt-payload.type';
import {
  AdminResetPasswordDto,
  ChangePasswordDto,
  LoginDto,
  MandatoryPasswordChangeDto,
  RefreshDto,
  ToggleAccountStatusDto,
  UpdateOwnProfileDto,
} from './dto';
import { AllowPasswordChange } from './guards/allow-password-change.decorator';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';
import { unwrapIdentityResult } from './identity-http.util';
import {
  ADMIN_RESET_PASSWORD_USE_CASE,
  CHANGE_PASSWORD_USE_CASE,
  GET_AUTHENTICATED_USER_CONTEXT_USE_CASE,
  LIST_SESSIONS_USE_CASE,
  LOGIN_USE_CASE,
  LOGOUT_ALL_USE_CASE,
  LOGOUT_USE_CASE,
  MANDATORY_PASSWORD_CHANGE_USE_CASE,
  REFRESH_SESSION_USE_CASE,
  REVOKE_SESSION_USE_CASE,
  TOGGLE_ACCOUNT_STATUS_USE_CASE,
  UPDATE_OWN_PROFILE_USE_CASE,
} from './identity.tokens';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth/refresh';

@Controller()
export class IdentityController {
  constructor(
    private readonly config: ConfigService,
    @Inject(LOGIN_USE_CASE) private readonly loginUseCase: LoginUseCase,
    @Inject(REFRESH_SESSION_USE_CASE)
    private readonly refreshUseCase: RefreshSessionUseCase,
    @Inject(LOGOUT_USE_CASE) private readonly logoutUseCase: LogoutUseCase,
    @Inject(LOGOUT_ALL_USE_CASE)
    private readonly logoutAllUseCase: LogoutAllUseCase,
    @Inject(LIST_SESSIONS_USE_CASE)
    private readonly listSessionsUseCase: ListSessionsUseCase,
    @Inject(GET_AUTHENTICATED_USER_CONTEXT_USE_CASE)
    private readonly getAuthenticatedUserContextUseCase: GetAuthenticatedUserContextUseCase,
    @Inject(REVOKE_SESSION_USE_CASE)
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    @Inject(CHANGE_PASSWORD_USE_CASE)
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    @Inject(MANDATORY_PASSWORD_CHANGE_USE_CASE)
    private readonly mandatoryPasswordChangeUseCase: MandatoryPasswordChangeUseCase,
    @Inject(ADMIN_RESET_PASSWORD_USE_CASE)
    private readonly adminResetUseCase: AdminResetPasswordUseCase,
    @Inject(TOGGLE_ACCOUNT_STATUS_USE_CASE)
    private readonly toggleStatusUseCase: ToggleAccountStatusUseCase,
    @Inject(UPDATE_OWN_PROFILE_USE_CASE)
    private readonly updateOwnProfileUseCase: UpdateOwnProfileUseCase,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: AuthenticatedRequest,
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute({
      codigoBanca: req.codigoBanca ?? '',
      username: body.username,
      password: body.password,
      deviceInfo: req.headers['user-agent'],
    });
    const auth = unwrapIdentityResult(result);
    this.setAuthCookies(res, auth);
    return this.publicAuth(auth);
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Body() body: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = (req as { cookies?: Record<string, string> }).cookies;
    const refreshToken = cookies?.[REFRESH_TOKEN_COOKIE] ?? '';
    const result = await this.refreshUseCase.execute({
      refreshToken,
      deviceInfo: body?.deviceInfo ?? req.headers['user-agent'],
    });
    if (result.isFailure) {
      this.clearAuthCookies(res);
    }
    const auth = unwrapIdentityResult(result);
    this.setAuthCookies(res, auth);
    return this.publicAuth(auth);
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtCookieAuthGuard)
  @AllowPasswordChange()
  async logout(
    @CurrentUser() user: AuthContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    unwrapIdentityResult(
      await this.logoutUseCase.execute({
        bancaId: user.bancaId,
        sessionId: user.sessionId,
      }),
    );
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Post('auth/logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtCookieAuthGuard)
  @AllowPasswordChange()
  async logoutAll(
    @CurrentUser() user: AuthContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    unwrapIdentityResult(
      await this.logoutAllUseCase.execute({
        bancaId: user.bancaId,
        userId: user.userId,
      }),
    );
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Get('auth/sessions')
  @UseGuards(JwtCookieAuthGuard)
  async listSessions(@CurrentUser() user: AuthContext) {
    return unwrapIdentityResult(
      await this.listSessionsUseCase.execute({
        bancaId: user.bancaId,
        userId: user.userId,
        currentSessionId: user.sessionId,
      }),
    );
  }

  @Get('auth/me')
  @UseGuards(JwtCookieAuthGuard)
  async me(@CurrentUser() user: AuthContext) {
    return unwrapIdentityResult(
      await this.getAuthenticatedUserContextUseCase.execute({
        userId: user.userId,
        bancaId: user.bancaId,
        actorRole: user.role,
      }),
    );
  }

  @Patch('auth/me')
  @UseGuards(JwtCookieAuthGuard)
  async updateOwnProfile(
    @CurrentUser() user: AuthContext,
    @Body() body: UpdateOwnProfileDto,
  ) {
    unwrapIdentityResult(
      await this.updateOwnProfileUseCase.execute({
        bancaId: user.bancaId,
        userId: user.userId,
        actorRole: user.role,
        expectedVersion: body.version,
        name: body.name,
        email: body.email,
      }),
    );
    return { success: true };
  }

  @Delete('auth/sessions/:sessionId')
  @UseGuards(JwtCookieAuthGuard)
  async revokeSession(
    @CurrentUser() user: AuthContext,
    @Param('sessionId') sessionId: string,
  ) {
    return unwrapIdentityResult(
      await this.revokeSessionUseCase.execute({
        bancaId: user.bancaId,
        userId: user.userId,
        sessionId,
      }),
    );
  }

  @Patch('auth/password')
  @UseGuards(JwtCookieAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthContext,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = unwrapIdentityResult(
      await this.changePasswordUseCase.execute({
        bancaId: user.bancaId,
        userId: user.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        currentSessionId: user.sessionId,
      }),
    );
    this.setAccessTokenCookie(
      res,
      result.accessToken,
      result.accessTokenExpiresAt,
    );
    return {
      userId: user.userId,
      bancaId: user.bancaId,
      sessionId: user.sessionId,
      role: user.role,
      mustChangePassword: false,
    };
  }

  @Patch('auth/mandatory-password-change')
  @UseGuards(JwtCookieAuthGuard)
  @AllowPasswordChange()
  async mandatoryPasswordChange(
    @CurrentUser() user: AuthContext,
    @Body() body: MandatoryPasswordChangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = unwrapIdentityResult(
      await this.mandatoryPasswordChangeUseCase.execute({
        bancaId: user.bancaId,
        userId: user.userId,
        newPassword: body.newPassword,
        currentSessionId: user.sessionId,
      }),
    );
    this.setAccessTokenCookie(
      res,
      result.accessToken,
      result.accessTokenExpiresAt,
    );
    return {
      userId: user.userId,
      bancaId: user.bancaId,
      sessionId: user.sessionId,
      role: user.role,
      mustChangePassword: false,
    };
  }

  @Patch('auth/admin/reset-password')
  @UseGuards(JwtCookieAuthGuard)
  async adminResetPassword(
    @CurrentUser() user: AuthContext,
    @Body() body: AdminResetPasswordDto,
  ) {
    return unwrapIdentityResult(
      await this.adminResetUseCase.execute({
        bancaId: user.bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: body.targetUserId,
      }),
    );
  }

  @Patch('accounts/:accountId/status')
  @UseGuards(JwtCookieAuthGuard)
  async toggleStatus(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('accountId') accountId: string,
    @Body() body: ToggleAccountStatusDto,
  ) {
    return unwrapIdentityResult(
      await this.toggleStatusUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        targetUserId: accountId,
        action: body.action,
      }),
    );
  }

  // --- helpers ---

  private publicAuth(auth: AuthResultDto) {
    return {
      userId: auth.userId,
      bancaId: auth.bancaId,
      sessionId: auth.sessionId,
      role: auth.role,
      mustChangePassword: auth.mustChangePassword,
    };
  }

  private isSecure(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private setAccessTokenCookie(
    res: Response,
    token: string,
    expiresAt: Date,
  ): void {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.isSecure(),
      sameSite: 'strict',
      path: '/',
      expires: expiresAt,
    });
  }

  private setAuthCookies(res: Response, auth: AuthResultDto): void {
    const secure = this.isSecure();
    res.cookie(ACCESS_TOKEN_COOKIE, auth.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      expires: auth.accessTokenExpiresAt,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, auth.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: auth.refreshTokenExpiresAt,
    });
  }

  private clearAuthCookies(res: Response): void {
    const secure = this.isSecure();
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }
}
