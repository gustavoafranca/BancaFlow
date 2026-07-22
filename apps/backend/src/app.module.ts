import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { DbModule } from './db/db.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { PlatformProvisioningModule } from './modules/platform/platform-provisioning.module';
import { ParticipantsModule } from './modules/participants/participants.module';

@Module({
  imports: [
    ParticipantsModule,
    IdentityModule,
    TenancyModule,
    PlatformProvisioningModule,
    AccessControlModule,
    DbModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
