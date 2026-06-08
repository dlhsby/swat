import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** The actor behind a mutation — id may be absent for system-initiated writes. */
export interface AuditActor {
  readonly id?: number | null;
  readonly username: string;
}

export interface AuditEvent {
  readonly actor: AuditActor;
  /** Dotted verb, e.g. `user.create`, `role.update`, `trip.verify`. */
  readonly action: string;
  /** Domain entity name, e.g. `User`, `Role`, `Trip`. */
  readonly entityType: string;
  /** Stringified primary key (BigInt-safe). */
  readonly entityId: string | number | bigint;
  readonly details?: string | null;
}

/**
 * Append-only audit trail for sensitive, non-authentication mutations. Writing
 * an audit row must NEVER break the originating request, so failures are logged
 * (without PII) and swallowed — mirrors `AuthService`'s auth-event auditing.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: event.actor.id ?? null,
          actorName: event.actor.username.slice(0, 100),
          action: event.action.slice(0, 64),
          entityType: event.entityType.slice(0, 48),
          entityId: String(event.entityId).slice(0, 64),
          details: event.details ? event.details.slice(0, 512) : null,
          timestamp: new Date(),
        },
      });
    } catch {
      this.logger.warn(`Gagal menulis audit log (${event.action})`);
    }
  }
}
