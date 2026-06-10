import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface LicenseClassDto {
  readonly id: string;
  readonly name: string;
}

/** Read-only SIM-class lookup (seeded: A, BI, BI Umum, BII, BII Umum, C, D). */
@ApiTags('license-classes')
@Controller('license-classes')
export class LicenseClassesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('license:read')
  @ApiOperation({ summary: 'List driving-license classes' })
  async list(): Promise<LicenseClassDto[]> {
    const rows = await this.prisma.licenseClass.findMany({ orderBy: { id: 'asc' } });
    return rows.map((row) => ({ id: row.id, name: row.name }));
  }
}
