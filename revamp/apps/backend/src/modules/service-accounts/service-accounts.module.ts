import { Module } from '@nestjs/common';

import { ServiceAccountsController } from './service-accounts.controller';
import { ServiceAccountsRepository } from './service-accounts.repository';
import { ServiceAccountsService } from './service-accounts.service';

@Module({
  controllers: [ServiceAccountsController],
  providers: [ServiceAccountsService, ServiceAccountsRepository],
  // Exported so the weighbridge guard (IntegrationsModule) can validate API keys.
  exports: [ServiceAccountsService],
})
export class ServiceAccountsModule {}
