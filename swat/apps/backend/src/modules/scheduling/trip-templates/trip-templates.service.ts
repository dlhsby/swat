import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { formatTimeOnly, parseTimeOnly } from '../../../common/dates';
import { PrismaService } from '../../prisma/prisma.service';

import {
  type CreateTripTemplateDto,
  type UpdateTripTemplateDto,
} from './dto/create-trip-template.dto';

const templateInclude = {
  route: {
    select: {
      id: true,
      category: true,
      originSite: { select: { name: true } },
      destinationSite: { select: { name: true } },
    },
  },
} satisfies Prisma.TripTemplateInclude;

type TemplateWithRoute = Prisma.TripTemplateGetPayload<{ include: typeof templateInclude }>;

export interface TripTemplateDto {
  readonly id: string;
  readonly scheduleTemplateId: string;
  readonly routeId: string;
  readonly routeCategory: string;
  readonly routeLabel: string;
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
    routeCategory: template.route.category,
    routeLabel: `${template.route.originSite.name} → ${template.route.destinationSite.name}`,
    targetTime: formatTimeOnly(template.targetTime),
    fuelRequestedLiters:
      template.fuelRequestedLiters === null ? null : Number(template.fuelRequestedLiters),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

@Injectable()
export class TripTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertScheduleExists(scheduleTemplateId: string): Promise<void> {
    const schedule = await this.prisma.scheduleTemplate.findUnique({
      where: { id: scheduleTemplateId },
      select: { id: true },
    });
    if (!schedule) {
      throw new NotFoundException('Jadwal kru tidak ditemukan.');
    }
  }

  private async assertRouteExists(routeId: string): Promise<void> {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, deletedAt: null },
      select: { id: true },
    });
    if (!route) {
      throw new BadRequestException('Rute tidak ditemukan.');
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
    await this.assertRouteExists(dto.routeId);
    const row = await this.prisma.tripTemplate.create({
      data: {
        scheduleTemplateId,
        routeId: dto.routeId,
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
    if (dto.routeId !== undefined) {
      await this.assertRouteExists(dto.routeId);
    }
    const row = await this.prisma.tripTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.routeId !== undefined ? { routeId: dto.routeId } : {}),
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
    return { message: 'Template trayek telah dihapus.' };
  }

  private async findOwned(scheduleTemplateId: string, templateId: string): Promise<void> {
    const template = await this.prisma.tripTemplate.findFirst({
      where: { id: templateId, scheduleTemplateId },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException('Template trayek tidak ditemukan.');
    }
  }
}
