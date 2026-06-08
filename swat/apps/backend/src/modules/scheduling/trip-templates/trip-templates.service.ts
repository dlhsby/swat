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
  readonly id: number;
  readonly crewScheduleId: number;
  readonly routeId: number;
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
    crewScheduleId: template.crewScheduleId,
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

  private async assertScheduleExists(crewScheduleId: number): Promise<void> {
    const schedule = await this.prisma.crewSchedule.findUnique({
      where: { id: crewScheduleId },
      select: { id: true },
    });
    if (!schedule) {
      throw new NotFoundException('Jadwal kru tidak ditemukan.');
    }
  }

  private async assertRouteExists(routeId: number): Promise<void> {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, deletedAt: null },
      select: { id: true },
    });
    if (!route) {
      throw new BadRequestException('Rute tidak ditemukan.');
    }
  }

  async list(crewScheduleId: number): Promise<TripTemplateDto[]> {
    await this.assertScheduleExists(crewScheduleId);
    const rows = await this.prisma.tripTemplate.findMany({
      where: { crewScheduleId },
      include: templateInclude,
      orderBy: { targetTime: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(crewScheduleId: number, dto: CreateTripTemplateDto): Promise<TripTemplateDto> {
    await this.assertScheduleExists(crewScheduleId);
    await this.assertRouteExists(dto.routeId);
    const row = await this.prisma.tripTemplate.create({
      data: {
        crewScheduleId,
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
    crewScheduleId: number,
    templateId: number,
    dto: UpdateTripTemplateDto,
  ): Promise<TripTemplateDto> {
    await this.findOwned(crewScheduleId, templateId);
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

  async remove(crewScheduleId: number, templateId: number): Promise<{ message: string }> {
    await this.findOwned(crewScheduleId, templateId);
    await this.prisma.tripTemplate.delete({ where: { id: templateId } });
    return { message: 'Template trayek telah dihapus.' };
  }

  private async findOwned(crewScheduleId: number, templateId: number): Promise<void> {
    const template = await this.prisma.tripTemplate.findFirst({
      where: { id: templateId, crewScheduleId },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException('Template trayek tidak ditemukan.');
    }
  }
}
