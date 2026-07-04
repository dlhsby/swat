import { Global, Module } from '@nestjs/common';

import { CryptoModule } from '../common/crypto/crypto.module';
import { CacheModule } from '../modules/cache/cache.module';
import { PrismaModule } from '../modules/prisma/prisma.module';

import { AppConfigModule } from './config.module';
import { SystemConfigService } from './system-config.service';

/**
 * Global so any feature module can inject {@link SystemConfigService} to read
 * runtime-editable settings (DB → env → default). Its dependency modules are imported
 * explicitly (not just relied on as globals) so resolution never depends on module
 * init order.
 */
@Global()
@Module({
  imports: [AppConfigModule, PrismaModule, CacheModule, CryptoModule],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
