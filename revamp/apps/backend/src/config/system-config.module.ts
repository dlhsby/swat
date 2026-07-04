import { Global, Module } from '@nestjs/common';

import { SystemConfigService } from './system-config.service';

/**
 * Global so any feature module can inject {@link SystemConfigService} to read
 * runtime-editable settings (DB → env → default). Depends on the global Prisma,
 * Cache, and Crypto modules.
 */
@Global()
@Module({
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
