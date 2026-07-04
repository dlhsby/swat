import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { type Prisma } from '@prisma/client';

import { combineDateAndTime, formatDateOnly, todayDateOnly } from '../../../common/dates';
import { PrismaService } from '../../prisma/prisma.service';

export interface DailyInitResult {
  /** False when the day already existed (idempotent skip). */
  readonly created: boolean;
  readonly date: string;
  readonly transactionDayId: string;
  readonly hauls: number;
  readonly assignments: number;
  readonly trips: number;
}

const scheduleInclude = {
  vehicle: { select: { id: true, currentOdometer: true } },
  tripTemplates: {
    include: {
      route: {
        select: {
          id: true,
          category: true,
          originSite: { select: { name: true } },
          destinationSite: { select: { name: true } },
        },
      },
      // Pull the corridor's deletedAt so we can skip a soft-deleted one at init.
      corridor: { select: { id: true, deletedAt: true } },
    },
    orderBy: { targetTime: 'asc' },
  },
} satisfies Prisma.ScheduleTemplateInclude;

type ScheduleForInit = Prisma.ScheduleTemplateGetPayload<{ include: typeof scheduleInclude }>;
type TemplateForInit = ScheduleForInit['tripTemplates'][number];

/** Compose a human-readable trip name from its route (≤256 chars). */
function tripName(route: TemplateForInit['route']): string {
  const label = `${route.category}: ${route.originSite.name} → ${route.destinationSite.name}`;
  return label.slice(0, 256);
}

/**
 * Daily transaction initialization (Epic 1.7, T-123). At 03:00 every day this
 * materializes the day's operational plan from the standing schedule templates:
 * one {@link Haul} per vehicle, a {@link HaulAssignment} per crew shift, and a
 * {@link Trip} per trip template. Idempotent — a second run for the same date is
 * a no-op (the day's `date` is unique). All writes set `operationDate` so they
 * land in the correct monthly partition.
 */
@Injectable()
export class DailyInitService {
  private readonly logger = new Logger(DailyInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The corridor to stamp on the day's trip: the template's, unless it was
   * soft-deleted after the template was set (then omit + warn — the deviation
   * matcher's resolver falls back to the route's default corridor).
   */
  private carryTemplateCorridor(template: TemplateForInit): string | null {
    if (!template.corridorId) {
      return null;
    }
    // Omit a corridor that was soft-deleted after the template was set (or, defensively,
    // whose relation didn't resolve) — the matcher's resolver falls back to the route
    // default, so the trip is never created with a dangling corridor reference.
    if (!template.corridor || template.corridor.deletedAt !== null) {
      this.logger.warn(
        `Trip template ${template.id} references a missing/soft-deleted corridor ` +
          `${template.corridorId}; omitting (will use the route default).`,
      );
      return null;
    }
    return template.corridorId;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    await this.initializeForDate(todayDateOnly());
  }

  /** Run the initialization for today on demand (manual trigger / recovery). */
  handleManualToday(): Promise<DailyInitResult> {
    return this.initializeForDate(todayDateOnly());
  }

  /** Initialize the plan for a specific calendar date (UTC-midnight Date). */
  async initializeForDate(date: Date): Promise<DailyInitResult> {
    const dateLabel = formatDateOnly(date);
    const existing = await this.prisma.transactionDay.findUnique({
      where: { date },
      select: { id: true },
    });
    if (existing) {
      this.logger.log(`Daily init skipped for ${dateLabel}: transaction day already exists.`);
      return {
        created: false,
        date: dateLabel,
        transactionDayId: existing.id,
        hauls: 0,
        assignments: 0,
        trips: 0,
      };
    }

    // Skip schedules whose vehicle or driver has since been soft-deleted —
    // a retired vehicle / resigned driver must not spawn daily work.
    const schedules = await this.prisma.scheduleTemplate.findMany({
      where: { vehicle: { deletedAt: null }, driver: { deletedAt: null } },
      include: scheduleInclude,
    });
    const byVehicle = this.groupByVehicle(schedules);

    const groups = [...byVehicle.values()];

    // Bulk-insert the whole tree in three round-trips (haul → assignment → trip)
    // rather than one INSERT per row. The full operator roster is ~1.4k schedules,
    // and per-row sequential creates blow the interactive-transaction timeout; a
    // `timeout` is kept as a safety net. `createManyAndReturn` gives us the
    // generated ids to wire the children.
    const result = await this.prisma.$transaction(
      async (tx) => {
        const day = await tx.transactionDay.create({
          data: { date, status: 'IN_PROGRESS' },
          select: { id: true },
        });
        if (groups.length === 0) {
          return { transactionDayId: day.id, hauls: 0, assignments: 0, trips: 0 };
        }

        // 1. One Haul per vehicle.
        const createdHauls = await tx.haul.createManyAndReturn({
          data: groups.map((group) => ({
            transactionDayId: day.id,
            vehicleId: group.vehicleId,
            operationDate: date,
            status: 'IN_PROGRESS',
          })),
          select: { id: true, vehicleId: true },
        });
        const haulIdByVehicle = new Map(createdHauls.map((h) => [h.vehicleId, h.id]));

        // 2. One HaulAssignment per crew shift.
        const assignmentData = groups.flatMap((group) =>
          group.schedules.map((schedule) => ({
            haulId: haulIdByVehicle.get(group.vehicleId) as string,
            driverId: schedule.driverId,
            scheduleTemplateId: schedule.id,
            operationDate: date,
            status: 'IN_PROGRESS' as const,
            departTargetOdometer: group.currentOdometer,
            returnTargetOdometer: group.currentOdometer,
            departTargetTime: combineDateAndTime(date, schedule.departTime),
            returnTargetTime: combineDateAndTime(date, schedule.returnTime),
          })),
        );
        const createdAssignments = await tx.haulAssignment.createManyAndReturn({
          data: assignmentData,
          select: { id: true, scheduleTemplateId: true },
        });
        // Each schedule yields exactly one assignment, so scheduleTemplateId is a unique key.
        const assignmentIdBySchedule = new Map(
          createdAssignments.map((a) => [a.scheduleTemplateId, a.id]),
        );

        // 3. One Trip per trip template. A corridor soft-deleted after the template
        // was set is skipped (the matcher falls back to the route default).
        const tripData = groups.flatMap((group) =>
          group.schedules.flatMap((schedule) =>
            schedule.tripTemplates.map((template) => {
              const corridorId = this.carryTemplateCorridor(template);
              return {
                haulAssignmentId: assignmentIdBySchedule.get(schedule.id) as string,
                routeId: template.routeId,
                ...(corridorId ? { corridorId } : {}),
                operationDate: date,
                status: 'IN_PROGRESS' as const,
                name: tripName(template.route),
                targetOdometer: group.currentOdometer,
                targetTime: combineDateAndTime(date, template.targetTime),
                scheduledEntryAt: combineDateAndTime(date, template.targetTime),
                ...(template.fuelRequestedLiters !== null
                  ? { fuelRequestedLiters: template.fuelRequestedLiters }
                  : {}),
              };
            }),
          ),
        );
        if (tripData.length > 0) {
          await tx.trip.createMany({ data: tripData });
        }

        return {
          transactionDayId: day.id,
          hauls: createdHauls.length,
          assignments: createdAssignments.length,
          trips: tripData.length,
        };
      },
      { timeout: 120_000, maxWait: 15_000 },
    );

    this.logger.log(
      `Daily init for ${dateLabel}: ${result.hauls} hauls, ${result.assignments} assignments, ${result.trips} trips.`,
    );
    return { created: true, date: dateLabel, ...result };
  }

  /** Group schedules by vehicle so each vehicle gets a single haul per day. */
  private groupByVehicle(
    schedules: ScheduleForInit[],
  ): Map<string, { vehicleId: string; currentOdometer: number; schedules: ScheduleForInit[] }> {
    const groups = new Map<
      string,
      { vehicleId: string; currentOdometer: number; schedules: ScheduleForInit[] }
    >();
    for (const schedule of schedules) {
      const existing = groups.get(schedule.vehicleId);
      if (existing) {
        existing.schedules.push(schedule);
      } else {
        groups.set(schedule.vehicleId, {
          vehicleId: schedule.vehicleId,
          currentOdometer: schedule.vehicle.currentOdometer,
          schedules: [schedule],
        });
      }
    }
    return groups;
  }
}
