import {
  GetOwnEffectivePermissionsUseCase,
  GetRolePermissionMatrixUseCase,
} from '@bancaflow/access-control';
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AccessControlController } from './access-control.controller';
import {
  GET_OWN_EFFECTIVE_PERMISSIONS_USE_CASE,
  GET_ROLE_PERMISSION_MATRIX_USE_CASE,
} from './access-control.tokens';

@Module({
  imports: [IdentityModule, TenancyModule],
  controllers: [AccessControlController],
  providers: [
    {
      provide: GET_ROLE_PERMISSION_MATRIX_USE_CASE,
      useFactory: () => new GetRolePermissionMatrixUseCase(),
    },
    {
      provide: GET_OWN_EFFECTIVE_PERMISSIONS_USE_CASE,
      useFactory: () => new GetOwnEffectivePermissionsUseCase(),
    },
  ],
})
export class AccessControlModule {}
