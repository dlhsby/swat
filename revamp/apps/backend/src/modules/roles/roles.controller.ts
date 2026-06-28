import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../common/auth/session.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';
import { type RoleDetailDto, type RoleDto } from './roles.types';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'List roles with permission ids and user counts' })
  list(): Promise<RoleDto[]> {
    return this.roles.list();
  }

  @Get(':id')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'Get a role with its permissions' })
  getById(@Param('id') id: string): Promise<RoleDetailDto> {
    return this.roles.getById(id);
  }

  @Post()
  @RequirePermissions('role:create')
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: SessionUser): Promise<RoleDto> {
    return this.roles.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  @ApiOperation({ summary: 'Update a role (replaces permission set)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: SessionUser,
  ): Promise<RoleDto> {
    return this.roles.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @ApiOperation({ summary: 'Delete a role (blocked while assigned to users)' })
  remove(@Param('id') id: string, @CurrentUser() actor: SessionUser): Promise<{ message: string }> {
    return this.roles.remove(id, actor);
  }
}
