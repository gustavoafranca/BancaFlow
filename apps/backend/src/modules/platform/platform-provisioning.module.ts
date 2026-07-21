import type { CreateUserAccountPort } from '@bancaflow/identity';
import type { TransactionManager } from '@bancaflow/shared';
import { BancaRepository, ProvisionBancaUseCase } from '@bancaflow/tenancy';
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CREATE_USER_ACCOUNT_USE_CASE } from '../identity/identity.tokens';
import {
  BANCA_REPOSITORY,
  TENANCY_TRANSACTION_MANAGER,
  TenancyModule,
} from '../tenancy/tenancy.module';

@Module({
  imports: [IdentityModule, TenancyModule],
  providers: [
    {
      provide: ProvisionBancaUseCase,
      useFactory: (
        bancas: BancaRepository,
        createUserAccount: CreateUserAccountPort,
        tx: TransactionManager,
      ) => new ProvisionBancaUseCase(bancas, createUserAccount, tx),
      inject: [
        BANCA_REPOSITORY,
        CREATE_USER_ACCOUNT_USE_CASE,
        TENANCY_TRANSACTION_MANAGER,
      ],
    },
  ],
  exports: [ProvisionBancaUseCase],
})
export class PlatformProvisioningModule {}
