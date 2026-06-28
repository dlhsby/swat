import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { permissionGroup } from '../../common/auth/permission-catalog';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsSyncService } from '../permissions/permissions-sync.service';
import { PrismaService } from '../prisma/prisma.service';

import { type PermissionDto } from './roles.types';

/**
 * Read-only catalog of assignable permissions (seeded). Powers the role-editor
 * permission toggles in the admin UI. Also exposes an admin-only `sync` action
 * that reconciles the DB against the code-defined catalog on demand.
 */
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: PermissionsSyncService,
  ) {}

  @Get()
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: 'List all assignable permissions' })
  async list(): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
    return permissions.map((p) => ({
      id: p.id,
      key: p.key,
      description: p.description,
      group: permissionGroup(p.key),
    }));
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:manage')
  @ApiOperation({ summary: 'Reconcile the permission catalog from the code source of truth' })
  @ApiOkResponse({ schema: { example: { message: 'Sinkronisasi izin selesai (96).', count: 96 } } })
  async syncCatalog(): Promise<{ message: string; count: number }> {
    const count = await this.sync.syncCatalog();
    return { message: `Sinkronisasi izin selesai (${count}).`, count };
  }
}
