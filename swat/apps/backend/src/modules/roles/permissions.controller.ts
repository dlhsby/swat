import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

import { type PermissionDto } from './roles.types';

/**
 * Read-only catalog of assignable permissions (seeded). Powers the role-editor
 * permission toggles in the admin UI.
 */
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: 'List all assignable permissions' })
  async list(): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
    return permissions.map((p) => ({ id: p.id, key: p.key, description: p.description }));
  }
}
