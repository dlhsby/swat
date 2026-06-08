import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { type Prisma } from '@prisma/client';

import { combineDateAndTime, formatDateOnly, todayDateOnly } from '../../../common/dates';
import { PrismaService } from '../../prisma/prisma.service';

export interface DailyInitResult {
  /** False when the day already existed (idempotent skip). */
  readonly created: boolean;
  readonly date: string;
  readonly transactionDayId: number;
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
    },
    orderBy: { targetTime: 'asc' },
  },
} satisfies Prisma.CrewScheduleInclude;

type ScheduleForInit = Prisma.CrewScheduleGetPayload<{ include: typeof scheduleInclude }>;
type TemplateForInit = ScheduleForInit['tripTemplates'][number];

/** Compose a human-readable trip name from its route (≤256 chars). */
function tripName(route: TemplateForInit['route']): string {
  const label = `${route.category}: ${route.originSite.name} → ${route.destinationSite.name}`;
  return label.slice(0, 256);
}

/**
 * Daily transaction initialization (Epic 1.7, T-123). At 03:00 every day this
 * materializes the day's operational plan from the standing crew schedules:
 * one {@link Haul} per vehicle, a {@link HaulAssignment} per crew shift, and a
 * {@link Trip} per trip template. Idempotent — a second run for the same date is
 * a no-op (the day's `date` is unique). All writes set `operationDate` so they
 * land in the correct monthly partition.
 */
@Injectable()
export class DailyInitService {
  private readonly logger = new Logger(DailyInitService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    const schedules = await this.prisma.crewSchedule.findMany({ include: scheduleInclude });
    const byVehicle = this.groupByVehicle(schedules);

    const result = await this.prisma.$transaction(async (tx) => {
      const day = await tx.transactionDay.create({
        data: { date, status: 'IN_PROGRESS' },
        select: { id: true },
      });

      let hauls = 0;
      let assignments = 0;
      let trips = 0;

      for (const group of byVehicle.values()) {
        const haul = await tx.haul.create({
          data: {
            transactionDayId: day.id,
            vehicleId: group.vehicleId,
            operationDate: date,
            status: 'IN_PROGRESS',
          },
          select: { id: true },
        });
        hauls += 1;

        for (const schedule of group.schedules) {
          const assignment = await tx.haulAssignment.create({
            data: {
              haulId: haul.id,
              driverId: schedule.driverId,
              crewScheduleId: schedule.id,
              operationDate: date,
              status: 'IN_PROGRESS',
              departTargetOdometer: group.currentOdometer,
              returnTargetOdometer: group.currentOdometer,
              departTargetTime: combineDateAndTime(date, schedule.departTime),
              returnTargetTime: combineDateAndTime(date, schedule.returnTime),
            },
            select: { id: true },
          });
          assignments += 1;

          for (const template of schedule.tripTemplates) {
            await tx.trip.create({
              data: {
                haulAssignmentId: assignment.id,
                routeId: template.routeId,
                operationDate: date,
                status: 'IN_PROGRESS',
                name: tripName(template.route),
                targetOdometer: group.currentOdometer,
                targetTime: combineDateAndTime(date, template.targetTime),
                scheduledEntryAt: combineDateAndTime(date, template.targetTime),
                ...(template.fuelRequestedLiters !== null
                  ? { fuelRequestedLiters: template.fuelRequestedLiters }
                  : {}),
              },
            });
            trips += 1;
          }
        }
      }

      return { transactionDayId: day.id, hauls, assignments, trips };
    });

    this.logger.log(
      `Daily init for ${dateLabel}: ${result.hauls} hauls, ${result.assignments} assignments, ${result.trips} trips.`,
    );
    return { created: true, date: dateLabel, ...result };
  }

  /** Group schedules by vehicle so each vehicle gets a single haul per day. */
  private groupByVehicle(
    schedules: ScheduleForInit[],
  ): Map<number, { vehicleId: number; currentOdometer: number; schedules: ScheduleForInit[] }> {
    const groups = new Map<
      number,
      { vehicleId: number; currentOdometer: number; schedules: ScheduleForInit[] }
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
