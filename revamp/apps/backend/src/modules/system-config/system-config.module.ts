import { Module } from '@nestjs/common';

import { ConfigPublicController } from './config-public.controller';
import { SystemConfigController } from './system-config.controller';

/**
 * HTTP surface for runtime settings: the admin editor (`/system-config`, gated by
 * `system-config:manage`) and the unauthenticated public config (`/config/public`).
 * The resolving {@link SystemConfigService} is provided globally by SystemConfigModule.
 */
@Module({
  controllers: [SystemConfigController, ConfigPublicController],
})
export class SystemConfigApiModule {}
