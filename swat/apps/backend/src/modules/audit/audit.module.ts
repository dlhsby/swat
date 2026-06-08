import { Global, Module } from '@nestjs/common';

import { AuditService } from './audit.service';

/**
 * Global audit module. Exposes a single {@link AuditService} so any feature
 * module can record sensitive mutations without re-importing it.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
