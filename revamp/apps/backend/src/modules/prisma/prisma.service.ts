import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { auditExtension } from '../../common/audit/audit-prisma.extension';
import { pgAdapter } from '../../common/prisma/pg-adapter';
import { AppConfigService } from '../../config';

/**
 * Nest-managed PrismaClient (Prisma 7).
 *
 * Connects through the `@prisma/adapter-pg` driver adapter (Prisma 7 removed the
 * implicit `datasource.url`). The audit behaviour — soft-delete, created/updated/
 * deleted-by stamping, and AuditLog history — is applied as a client `$extends`
 * extension (Prisma 7 removed `$use`); the extended client is returned from the
 * constructor so repositories inject a single audited instance and stay unchanged.
 *
 * Connects on module init and disconnects on shutdown via Nest's lifecycle hooks
 * (`enableShutdownHooks` in `main.ts`).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({ adapter: pgAdapter(config.databaseUrl) });
    // $extends returns a NEW client; return it as the injected instance so every
    // repository goes through the audit extension. The lifecycle hooks below are
    // forwarded to the underlying client by the extension proxy.
    return this.$extends(auditExtension(this as never)) as unknown as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
