import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type EmploymentStatus } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import { DriversRepository, type DriverWithPool } from './drivers.repository';
import { type CreateDriverDto } from './dto/create-driver.dto';
import { type ListDriversQueryDto } from './dto/list-drivers.query.dto';
import { type UpdateDriverDto } from './dto/update-driver.dto';

const MIN_AGE_YEARS = 18;

export interface DriverDto {
  readonly id: number;
  readonly name: string;
  readonly idCardNumber: string;
  readonly poolSiteId: number;
  readonly poolSiteName: string;
  readonly employmentStatus: EmploymentStatus;
  readonly originAddress: string;
  readonly currentAddress: string;
  readonly birthDate: string;
  readonly contact: string;
  readonly safetyTraining: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(driver: DriverWithPool): DriverDto {
  return {
    id: driver.id,
    name: driver.name,
    idCardNumber: driver.idCardNumber,
    poolSiteId: driver.poolSiteId,
    poolSiteName: driver.poolSite.name,
    employmentStatus: driver.employmentStatus,
    originAddress: driver.originAddress,
    currentAddress: driver.currentAddress,
    birthDate: formatDateOnly(driver.birthDate),
    contact: driver.contact,
    safetyTraining: driver.safetyTraining,
    notes: driver.notes,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}

/** Reject if the person would be under 18 as of today. */
function assertAdult(birthDate: Date): void {
  const eighteenthBirthday = new Date(birthDate);
  eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + MIN_AGE_YEARS);
  if (eighteenthBirthday.getTime() > Date.now()) {
    throw new BadRequestException('Pengemudi harus berusia minimal 18 tahun.');
  }
}

@Injectable()
export class DriversService {
  constructor(private readonly repo: DriversRepository) {}

  async list(query: ListDriversQueryDto): Promise<{ data: DriverDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      poolSiteId: query.poolSiteId,
      employmentStatus: query.employmentStatus,
      search: query.search,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: number): Promise<DriverDto> {
    const driver = await this.repo.findById(id);
    if (!driver) {
      throw new NotFoundException('Pengemudi tidak ditemukan.');
    }
    return toDto(driver);
  }

  async create(dto: CreateDriverDto): Promise<DriverDto> {
    await this.assertSiteExists(dto.poolSiteId);
    const birthDate = parseDateOnly(dto.birthDate);
    assertAdult(birthDate);

    const duplicate = await this.repo.findByIdCard(dto.idCardNumber);
    if (duplicate) {
      throw new ConflictException('Nomor KTP sudah terdaftar.');
    }

    const driver = await this.repo.create({
      name: dto.name,
      idCardNumber: dto.idCardNumber,
      employmentStatus: dto.employmentStatus,
      originAddress: dto.originAddress,
      currentAddress: dto.currentAddress,
      birthDate,
      contact: dto.contact,
      ...(dto.safetyTraining !== undefined ? { safetyTraining: dto.safetyTraining } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      poolSite: { connect: { id: dto.poolSiteId } },
    });
    return toDto(driver);
  }

  async update(id: number, dto: UpdateDriverDto): Promise<DriverDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Pengemudi tidak ditemukan.');
    }
    if (dto.poolSiteId !== undefined) {
      await this.assertSiteExists(dto.poolSiteId);
    }
    if (dto.birthDate !== undefined) {
      assertAdult(parseDateOnly(dto.birthDate));
    }
    if (dto.idCardNumber !== undefined && dto.idCardNumber !== existing.idCardNumber) {
      const duplicate = await this.repo.findByIdCard(dto.idCardNumber);
      if (duplicate) {
        throw new ConflictException('Nomor KTP sudah terdaftar.');
      }
    }

    const driver = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.idCardNumber !== undefined ? { idCardNumber: dto.idCardNumber } : {}),
      ...(dto.employmentStatus !== undefined ? { employmentStatus: dto.employmentStatus } : {}),
      ...(dto.originAddress !== undefined ? { originAddress: dto.originAddress } : {}),
      ...(dto.currentAddress !== undefined ? { currentAddress: dto.currentAddress } : {}),
      ...(dto.birthDate !== undefined ? { birthDate: parseDateOnly(dto.birthDate) } : {}),
      ...(dto.contact !== undefined ? { contact: dto.contact } : {}),
      ...(dto.safetyTraining !== undefined ? { safetyTraining: dto.safetyTraining } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.poolSiteId !== undefined ? { poolSite: { connect: { id: dto.poolSiteId } } } : {}),
    });
    return toDto(driver);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.getById(id);
    await this.repo.softDelete(id);
    return { message: 'Pengemudi telah dihapus.' };
  }

  private async assertSiteExists(poolSiteId: number): Promise<void> {
    const site = await this.repo.siteExists(poolSiteId);
    if (!site) {
      throw new BadRequestException('Pool tidak ditemukan.');
    }
  }
}
