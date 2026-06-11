import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, type SiteType } from '@prisma/client';

import { formatTimeOnly, parseTimeOnly } from '../../../common/dates';
import { RoutesService } from '../../geography/routes/routes.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  type CreateTripTemplateDto,
  type UpdateTripTemplateDto,
} from './dto/create-trip-template.dto';

const templateInclude = {
  // Read the denormalized snapshot (category lives on the row); only the site
  // names are joined for display.
  originSite: { select: { id: true, name: true } },
  destinationSite: { select: { id: true, name: true } },
} satisfies Prisma.TripTemplateInclude;

type TemplateWithRoute = Prisma.TripTemplateGetPayload<{ include: typeof templateInclude }>;

export interface TripTemplateDto {
  readonly id: string;
  readonly scheduleTemplateId: string;
  readonly routeId: string;
  readonly routeCategory: string;
  readonly routeLabel: string;
  readonly originSiteId: string;
  readonly originSiteName: string;
  readonly destinationSiteId: string;
  readonly destinationSiteName: string;
  readonly targetTime: string;
  readonly fuelRequestedLiters: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(template: TemplateWithRoute): TripTemplateDto {
  return {
    id: template.id,
    scheduleTemplateId: template.scheduleTemplateId,
    routeId: template.routeId,
    routeCategory: template.routeCategory,
    routeLabel: `${template.originSite.name} → ${template.destinationSite.name}`,
    originSiteId: template.originSite.id,
    originSiteName: template.originSite.name,
    destinationSiteId: template.destinationSite.id,
    destinationSiteName: template.destinationSite.name,
    targetTime: formatTimeOnly(template.targetTime),
    fuelRequestedLiters:
      template.fuelRequestedLiters === null ? null : Number(template.fuelRequestedLiters),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

@Injectable()
export class TripTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routes: RoutesService,
  ) {}

  private async assertScheduleExists(scheduleTemplateId: string): Promise<void> {
    const schedule = await this.prisma.scheduleTemplate.findFirst({
      where: { id: scheduleTemplateId, deletedAt: null },
      select: { id: true },
    });
    if (!schedule) {
      throw new NotFoundException('Jadwal kru tidak ditemukan.');
    }
  }

  async list(scheduleTemplateId: string): Promise<TripTemplateDto[]> {
    await this.assertScheduleExists(scheduleTemplateId);
    const rows = await this.prisma.tripTemplate.findMany({
      where: { scheduleTemplateId },
      include: templateInclude,
      orderBy: { targetTime: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(scheduleTemplateId: string, dto: CreateTripTemplateDto): Promise<TripTemplateDto> {
    await this.assertScheduleExists(scheduleTemplateId);
    // "Isi BBM" must declare how many litres are requested.
    if (
      dto.category === 'REFUEL' &&
      !(dto.fuelRequestedLiters !== undefined && dto.fuelRequestedLiters > 0)
    ) {
      throw new BadRequestException('BBM diajukan wajib diisi untuk leg Isi BBM.');
    }
    // Derive the leg's start/end from its category (Berangkat = Pool→Pool; every
    // other leg starts where the previous one ended), then resolve the (category,
    // origin, destination) triple to a route, creating it if this pairing has never
    // been recorded (legacy planner behaviour).
    const { originSiteId, destinationSiteId } = await this.resolveEndpoints(
      scheduleTemplateId,
      dto.category,
      dto.targetTime,
      dto.originSiteId,
      dto.destinationSiteId,
    );
    const route = await this.routes.resolveOrCreate(dto.category, originSiteId, destinationSiteId);
    const row = await this.prisma.tripTemplate.create({
      data: {
        scheduleTemplateId,
        routeId: route.id,
        // Snapshot the resolved route alongside the FK.
        routeCategory: dto.category,
        originSiteId,
        destinationSiteId,
        targetTime: parseTimeOnly(dto.targetTime),
        ...(dto.fuelRequestedLiters !== undefined
          ? { fuelRequestedLiters: dto.fuelRequestedLiters }
          : {}),
      },
      include: templateInclude,
    });
    return toDto(row);
  }

  async update(
    scheduleTemplateId: string,
    templateId: string,
    dto: UpdateTripTemplateDto,
  ): Promise<TripTemplateDto> {
    await this.findOwned(scheduleTemplateId, templateId);
    // A route change requires the full triple (category + start + end); partial
    // edits (time / fuel only) leave the existing route untouched.
    let routeChange:
      | { routeId: string; originSiteId: string; destinationSiteId: string }
      | undefined;
    if (
      dto.category !== undefined &&
      dto.originSiteId !== undefined &&
      dto.destinationSiteId !== undefined
    ) {
      const route = await this.routes.resolveOrCreate(
        dto.category,
        dto.originSiteId,
        dto.destinationSiteId,
      );
      routeChange = {
        routeId: route.id,
        originSiteId: dto.originSiteId,
        destinationSiteId: dto.destinationSiteId,
      };
    }
    const row = await this.prisma.tripTemplate.update({
      where: { id: templateId },
      data: {
        // Keep the FK and its snapshot in lockstep on a route change.
        ...(routeChange !== undefined
          ? {
              routeId: routeChange.routeId,
              routeCategory: dto.category,
              originSiteId: routeChange.originSiteId,
              destinationSiteId: routeChange.destinationSiteId,
            }
          : {}),
        ...(dto.targetTime !== undefined ? { targetTime: parseTimeOnly(dto.targetTime) } : {}),
        ...(dto.fuelRequestedLiters !== undefined
          ? { fuelRequestedLiters: dto.fuelRequestedLiters }
          : {}),
      },
      include: templateInclude,
    });
    return toDto(row);
  }

  async remove(scheduleTemplateId: string, templateId: string): Promise<{ message: string }> {
    await this.findOwned(scheduleTemplateId, templateId);
    await this.prisma.tripTemplate.delete({ where: { id: templateId } });
    return { message: 'Template rute telah dihapus.' };
  }

  private async findOwned(scheduleTemplateId: string, templateId: string): Promise<void> {
    const template = await this.prisma.tripTemplate.findFirst({
      where: { id: templateId, scheduleTemplateId },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException('Template rute tidak ditemukan.');
    }
  }

  /**
   * Map a leg's category to its concrete (origin, destination) sites:
   *  - DEPART_POOL: only the Pool is supplied; the leg is Pool→Pool.
   *  - any other leg: the start is the previous leg's destination, so only the
   *    destination is supplied and the origin is derived from the preceding leg.
   */
  private async resolveEndpoints(
    scheduleTemplateId: string,
    category: CreateTripTemplateDto['category'],
    targetTime: string,
    originSiteId?: string,
    destinationSiteId?: string,
  ): Promise<{ originSiteId: string; destinationSiteId: string }> {
    if (category === 'DEPART_POOL') {
      if (!originSiteId) {
        throw new BadRequestException('Lokasi pool wajib dipilih untuk leg berangkat.');
      }
      await this.assertSiteType(originSiteId, 'POOL');
      return { originSiteId, destinationSiteId: originSiteId };
    }
    if (!destinationSiteId) {
      throw new BadRequestException('Lokasi tujuan wajib dipilih.');
    }
    const previousDestinationId = await this.previousDestination(scheduleTemplateId, targetTime);
    if (!previousDestinationId) {
      throw new BadRequestException(
        "Tambahkan leg 'Berangkat' dari pool terlebih dahulu sebelum leg lainnya.",
      );
    }
    return { originSiteId: previousDestinationId, destinationSiteId };
  }

  /** The destination of the leg immediately preceding `targetTime`, if any. */
  private async previousDestination(
    scheduleTemplateId: string,
    targetTime: string,
  ): Promise<string | null> {
    const previous = await this.prisma.tripTemplate.findFirst({
      where: { scheduleTemplateId, targetTime: { lt: parseTimeOnly(targetTime) } },
      orderBy: { targetTime: 'desc' },
      select: { destinationSiteId: true },
    });
    return previous?.destinationSiteId ?? null;
  }

  private async assertSiteType(siteId: string, expected: SiteType): Promise<void> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
      select: { type: true },
    });
    if (!site) {
      throw new BadRequestException('Lokasi tidak ditemukan.');
    }
    if (site.type !== expected) {
      throw new BadRequestException(`Lokasi asal harus bertipe ${expected}.`);
    }
  }
}
