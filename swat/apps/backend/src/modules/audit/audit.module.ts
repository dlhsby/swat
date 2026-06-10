import { Global, Module } from '@nestjs/common';

import { ActorNamesService } from './actor-names.service';
import { AuditService } from './audit.service';

/**
 * Global audit module. Exposes {@link AuditService} (record mutations) and
 * {@link ActorNamesService} (resolve created-by/updated-by usernames for list
 * responses) so any feature module can use them without re-importing.
 */
@Global()
@Module({
  providers: [AuditService, ActorNamesService],
  exports: [AuditService, ActorNamesService],
})
export class AuditModule {}
