import { type Prisma } from '@prisma/client';

import { getActor } from './actor-context';

/**
 * Master/config models that carry the audit columns (`deletedAt`, `createdById`,
 * `updatedById`, `deletedById`) and participate in soft-delete + AuditLog. Names
 * are Prisma model names (as in `params.model`). Append-only/partitioned tables
 * (Trip, Haul, HaulAssignment, TpaInboundLog), rollups, and log tables are
 * deliberately excluded — they are immutable operational records.
 */
export const AUDITED_MODELS: ReadonlySet<string> = new Set<string>([
  'VehicleType',
  'Fuel',
  'FuelCategory',
  'VehicleModel',
  'Vehicle',
  'VehicleWasteSource',
  'WasteSource',
  'Driver',
  'DriverLicense',
  'LicenseClass',
  'Site',
  'Route',
  'ScheduleTemplate',
  'TripTemplate',
  'DisposalPermit',
  'User',
  'Role',
  'MaintenanceRecord',
  'VehicleInspection',
]);

const READ_ACTIONS = new Set<Prisma.PrismaAction>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/** Minimal surface needed to persist history rows (avoids importing PrismaService). */
interface AuditLogEntry {
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | null;
}
interface AuditLogWriter {
  auditLog: { create: (args: { data: AuditLogEntry }) => Promise<unknown> };
}

/* eslint-disable @typescript-eslint/no-explicit-any, no-param-reassign -- Prisma's $use middleware works by mutating `params`. */

function recordId(result: unknown): string {
  const id = (result as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : '(bulk)';
}

/**
 * Prisma `$use` middleware: for {@link AUDITED_MODELS} it auto-stamps the audit
 * columns, converts hard deletes to soft deletes, hides soft-deleted rows from
 * reads, and writes an `AuditLog` row per mutation. Repositories stay unchanged.
 */
export function auditMiddleware(client: AuditLogWriter): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;
    if (!model || !AUDITED_MODELS.has(model)) {
      return next(params);
    }
    const actor = getActor();
    const args: any = (params.args ??= {});

    // --- Reads: hide soft-deleted rows (opt out by passing `deletedAt` yourself).
    if (READ_ACTIONS.has(params.action)) {
      // findUnique can't take a non-unique filter; promote to findFirst.
      if (params.action === 'findUnique') params.action = 'findFirst';
      else if (params.action === 'findUniqueOrThrow') params.action = 'findFirstOrThrow';
      args.where ??= {};
      if (args.where.deletedAt === undefined) {
        args.where.deletedAt = null;
      }
      return next(params);
    }

    const now = new Date();
    let action: string | null = null;

    switch (params.action) {
      case 'create':
        args.data = { ...args.data, createdById: actor.id, updatedById: actor.id };
        action = 'create';
        break;
      case 'createMany':
        if (Array.isArray(args.data)) {
          args.data = args.data.map((d: any) => ({
            ...d,
            createdById: actor.id,
            updatedById: actor.id,
          }));
        }
        action = 'create';
        break;
      case 'update':
        args.data = { ...args.data, updatedById: actor.id };
        action = 'update';
        break;
      case 'updateMany':
        args.data = { ...args.data, updatedById: actor.id };
        action = 'update';
        break;
      case 'upsert':
        args.create = { ...args.create, createdById: actor.id, updatedById: actor.id };
        args.update = { ...args.update, updatedById: actor.id };
        action = 'upsert';
        break;
      case 'delete':
        params.action = 'update';
        args.data = { deletedAt: now, deletedById: actor.id, updatedById: actor.id };
        action = 'delete';
        break;
      case 'deleteMany':
        params.action = 'updateMany';
        args.data = { deletedAt: now, deletedById: actor.id, updatedById: actor.id };
        action = 'delete';
        break;
      default:
        return next(params);
    }

    const result = await next(params);

    if (action) {
      // History is best-effort: a failed audit write must never fail the mutation.
      try {
        await client.auditLog.create({
          data: {
            actorId: actor.id,
            actorName: actor.name,
            action,
            entityType: model,
            entityId: recordId(result),
          },
        });
      } catch {
        /* swallow — audit is non-critical */
      }
    }
    return result;
  };
}
