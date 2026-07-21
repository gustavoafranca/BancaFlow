import {
  ACCESS_CONTROL_ERRORS,
  type GetOwnEffectivePermissionsUseCase,
  type GetRolePermissionMatrixUseCase,
} from '@bancaflow/access-control';
import type { Result } from '@bancaflow/shared';
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthContext } from '../../shared/types/jwt-payload.type';
import { JwtCookieAuthGuard } from '../identity/guards/jwt-cookie-auth.guard';
import {
  GET_OWN_EFFECTIVE_PERMISSIONS_USE_CASE,
  GET_ROLE_PERMISSION_MATRIX_USE_CASE,
} from './access-control.tokens';

const STATUS_BY_CODE: Record<string, number> = {
  [ACCESS_CONTROL_ERRORS.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ACCESS_CONTROL_ERRORS.UNKNOWN_PERMISSION_KEY]:
    HttpStatus.INTERNAL_SERVER_ERROR,
};

@Controller('access-control')
export class AccessControlController {
  constructor(
    @Inject(GET_ROLE_PERMISSION_MATRIX_USE_CASE)
    private readonly getRolePermissionMatrixUseCase: GetRolePermissionMatrixUseCase,
    @Inject(GET_OWN_EFFECTIVE_PERMISSIONS_USE_CASE)
    private readonly getOwnEffectivePermissionsUseCase: GetOwnEffectivePermissionsUseCase,
  ) {}

  @Get('role-permissions')
  @UseGuards(JwtCookieAuthGuard)
  async getRolePermissions(@CurrentUser() user: AuthContext) {
    return this.unwrap(
      await this.getRolePermissionMatrixUseCase.execute({
        actorRole: user.role,
      }),
    );
  }

  @Get('me/permissions')
  @UseGuards(JwtCookieAuthGuard)
  async myPermissions(@CurrentUser() user: AuthContext) {
    return this.unwrap(
      await this.getOwnEffectivePermissionsUseCase.execute({
        actorRole: user.role,
      }),
    );
  }

  private unwrap<T>(result: Result<T>): T {
    if (result.isFailure) {
      const code = result.errors?.[0] ?? ACCESS_CONTROL_ERRORS.FORBIDDEN;
      const status = STATUS_BY_CODE[code] ?? HttpStatus.BAD_REQUEST;
      throw new HttpException(
        {
          statusCode: status,
          error: 'Access Control Error',
          code,
          message: [code],
        },
        status,
      );
    }
    return result.instance;
  }
}
