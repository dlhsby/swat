import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { auditMiddleware } from '../../common/audit/audit-prisma.middleware';

/**
 * Nest-managed PrismaClient.
 *
 * Extends the generated client so repositories inject a single, lifecycle-aware
 * instance instead of constructing their own (which would exhaust the connection
 * pool during dev hot-reloads). Connects on module init and disconnects on
 * shutdown via Nest's lifecycle hooks (`enableShutdownHooks` in `main.ts`).
 *
 * Registers the audit middleware so master/config models get soft-delete +
 * created/updated/deleted-by stamping + AuditLog history transparently.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.$use(auditMiddleware(this));
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
