import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { formatDateOnly, parseDateOnly } from '../../../../common/dates';
import { PrismaService } from '../../../prisma/prisma.service';

import {
  type CreateDriverLicenseDto,
  type UpdateDriverLicenseDto,
} from './dto/create-driver-license.dto';

export interface DriverLicenseDto {
  readonly id: string;
  readonly driverId: string;
  readonly licenseClassId: string;
  readonly licenseClassName: string;
  readonly licenseNumber: string;
  readonly expiry: string;
  readonly expired: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface LicenseRow {
  id: string;
  driverId: string;
  licenseClassId: string;
  licenseNumber: string;
  expiry: Date;
  createdAt: Date;
  updatedAt: Date;
  licenseClass: { name: string };
}

function toDto(row: LicenseRow): DriverLicenseDto {
  return {
    id: row.id,
    driverId: row.driverId,
    licenseClassId: row.licenseClassId,
    licenseClassName: row.licenseClass.name,
    licenseNumber: row.licenseNumber,
    expiry: formatDateOnly(row.expiry),
    expired: row.expiry.getTime() < Date.now(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class DriverLicensesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertDriverExists(driverId: string): Promise<void> {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) {
      throw new NotFoundException('Pengemudi tidak ditemukan.');
    }
  }

  async list(driverId: string): Promise<DriverLicenseDto[]> {
    await this.assertDriverExists(driverId);
    const rows = await this.prisma.driverLicense.findMany({
      where: { driverId },
      include: { licenseClass: { select: { name: true } } },
      orderBy: { expiry: 'desc' },
    });
    return rows.map(toDto);
  }

  async create(driverId: string, dto: CreateDriverLicenseDto): Promise<DriverLicenseDto> {
    await this.assertDriverExists(driverId);
    await this.assertClassExists(dto.licenseClassId);
    await this.assertNumberUnique(driverId, dto.licenseNumber);

    const row = await this.prisma.driverLicense.create({
      data: {
        driverId,
        licenseClassId: dto.licenseClassId,
        licenseNumber: dto.licenseNumber,
        expiry: parseDateOnly(dto.expiry),
      },
      include: { licenseClass: { select: { name: true } } },
    });
    return toDto(row);
  }

  async update(
    driverId: string,
    licenseId: string,
    dto: UpdateDriverLicenseDto,
  ): Promise<DriverLicenseDto> {
    const existing = await this.findOwned(driverId, licenseId);
    if (dto.licenseClassId !== undefined) {
      await this.assertClassExists(dto.licenseClassId);
    }
    if (dto.licenseNumber !== undefined && dto.licenseNumber !== existing.licenseNumber) {
      await this.assertNumberUnique(driverId, dto.licenseNumber);
    }

    const row = await this.prisma.driverLicense.update({
      where: { id: licenseId },
      data: {
        ...(dto.licenseClassId !== undefined ? { licenseClassId: dto.licenseClassId } : {}),
        ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber } : {}),
        ...(dto.expiry !== undefined ? { expiry: parseDateOnly(dto.expiry) } : {}),
      },
      include: { licenseClass: { select: { name: true } } },
    });
    return toDto(row);
  }

  async remove(driverId: string, licenseId: string): Promise<{ message: string }> {
    await this.findOwned(driverId, licenseId);
    await this.prisma.driverLicense.delete({ where: { id: licenseId } });
    return { message: 'SIM telah dihapus.' };
  }

  private async findOwned(driverId: string, licenseId: string): Promise<{ licenseNumber: string }> {
    const license = await this.prisma.driverLicense.findFirst({
      where: { id: licenseId, driverId },
      select: { licenseNumber: true },
    });
    if (!license) {
      throw new NotFoundException('SIM tidak ditemukan.');
    }
    return license;
  }

  private async assertClassExists(licenseClassId: string): Promise<void> {
    const cls = await this.prisma.licenseClass.findUnique({
      where: { id: licenseClassId },
      select: { id: true },
    });
    if (!cls) {
      throw new BadRequestException('Golongan SIM tidak ditemukan.');
    }
  }

  private async assertNumberUnique(driverId: string, licenseNumber: string): Promise<void> {
    const duplicate = await this.prisma.driverLicense.findFirst({
      where: { driverId, licenseNumber },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Nomor SIM sudah terdaftar untuk pengemudi ini.');
    }
  }
}
