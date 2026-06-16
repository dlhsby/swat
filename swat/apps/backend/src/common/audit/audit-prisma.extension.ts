import { Prisma } from '@prisma/client';

import { getActor } from './actor-context';

/**
 * Master/config models that carry the audit columns (`deletedAt`, `createdById`,
 * `updatedById`, `deletedById`) and participate in soft-delete + AuditLog. Names
 * are Prisma model names. Append-only/partitioned tables (Trip, Haul,
 * HaulAssignment, TpaInboundLog), rollups, and log tables are deliberately
 * excluded — they are immutable operational records.
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

const READ_ACTIONS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma client extensions
   operate on dynamic per-model args; the typed surface is reconstructed by callers. */

/** Minimal client surface the extension needs for re-dispatch + history writes. */
interface AuditBaseClient {
  auditLog: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  [delegate: string]: any;
}

function recordId(result: unknown): string {
  const id = (result as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : '(bulk)';
}

/** PascalCase model name → camelCase client delegate (e.g. `Vehicle` → `vehicle`). */
function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Prisma 7 client extension replacing the removed `$use` audit middleware. For
 * {@link AUDITED_MODELS} it auto-stamps the audit columns, converts hard deletes
 * to soft deletes (re-dispatched on the base client), hides soft-deleted rows from
 * reads, and writes an `AuditLog` row per mutation. Repositories stay unchanged.
 *
 * `base` is the un-extended client, used for delete→update re-dispatch and the
 * AuditLog write so neither re-enters the extension.
 */
export function auditExtension(base: AuditBaseClient) {
  return Prisma.defineExtension({
    name: 'swat-audit',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!AUDITED_MODELS.has(model)) {
            return query(args);
          }
          const actor = getActor();

          // --- Reads: hide soft-deleted rows (opt out by passing `deletedAt`).
          if (READ_ACTIONS.has(operation)) {
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              // findUnique can't take a non-unique `deletedAt` filter; post-filter.
              const res = (await query(args)) as { deletedAt?: unknown } | null;
              if (res && res.deletedAt != null) {
                if (operation === 'findUniqueOrThrow') {
                  throw new Prisma.PrismaClientKnownRequestError(
                    'No record was found for a query.',
                    { code: 'P2025', clientVersion: Prisma.prismaVersion.client },
                  );
                }
                return null;
              }
              return res;
            }
            const a: any = { ...(args as any) };
            a.where = { ...(a.where ?? {}) };
            if (a.where.deletedAt === undefined) {
              a.where.deletedAt = null;
            }
            return query(a);
          }

          const now = new Date();
          const a: any = { ...(args as any) };
          let action: string | null = null;
          let result: unknown;

          switch (operation) {
            case 'create':
              a.data = { ...a.data, createdById: actor.id, updatedById: actor.id };
              result = await query(a);
              action = 'create';
              break;
            case 'createMany':
              if (Array.isArray(a.data)) {
                a.data = a.data.map((d: any) => ({
                  ...d,
                  createdById: actor.id,
                  updatedById: actor.id,
                }));
              }
              result = await query(a);
              action = 'create';
              break;
            case 'update':
              a.data = { ...a.data, updatedById: actor.id };
              result = await query(a);
              action = 'update';
              break;
            case 'updateMany':
              a.data = { ...a.data, updatedById: actor.id };
              result = await query(a);
              action = 'update';
              break;
            case 'upsert':
              a.create = { ...a.create, createdById: actor.id, updatedById: actor.id };
              a.update = { ...a.update, updatedById: actor.id };
              result = await query(a);
              action = 'upsert';
              break;
            case 'delete':
              // Soft-delete: re-dispatch as an update on the base client (the
              // extension can't change a delete into an update in-place).
              result = await base[delegateName(model)].update({
                where: a.where,
                data: { deletedAt: now, deletedById: actor.id, updatedById: actor.id },
              });
              action = 'delete';
              break;
            case 'deleteMany':
              result = await base[delegateName(model)].updateMany({
                where: a.where,
                data: { deletedAt: now, deletedById: actor.id, updatedById: actor.id },
              });
              action = 'delete';
              break;
            default:
              return query(args);
          }

          // History is best-effort: a failed audit write must never fail the mutation.
          try {
            await base.auditLog.create({
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
          return result;
        },
      },
    },
  });
}
