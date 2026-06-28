import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../common/auth/session.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../common/types/api-response';

import { CreateServiceAccountDto } from './dto/create-service-account.dto';
import { ListServiceAccountsQueryDto } from './dto/list-service-accounts.query.dto';
import { UpdateServiceAccountDto } from './dto/update-service-account.dto';
import { ServiceAccountsService } from './service-accounts.service';
import { type CreatedServiceAccountDto, type ServiceAccountDto } from './service-accounts.types';

@ApiTags('service-accounts')
@Controller('admin/service-accounts')
export class ServiceAccountsController {
  constructor(private readonly accounts: ServiceAccountsService) {}

  @Get()
  @RequirePermissions('service-account:read')
  @ApiOperation({ summary: 'List service accounts (paginated; keys masked)' })
  list(
    @Query() query: ListServiceAccountsQueryDto,
  ): Promise<{ data: ServiceAccountDto[]; meta: PaginationMeta }> {
    return this.accounts.list(query);
  }

  @Get(':id')
  @RequirePermissions('service-account:read')
  @ApiOperation({ summary: 'Get a service account by id' })
  getById(@Param('id') id: string): Promise<ServiceAccountDto> {
    return this.accounts.getById(id);
  }

  @Post()
  @RequirePermissions('service-account:create')
  @ApiOperation({ summary: 'Create a service account (returns the API key ONCE)' })
  create(
    @Body() dto: CreateServiceAccountDto,
    @CurrentUser() actor: SessionUser,
  ): Promise<CreatedServiceAccountDto> {
    return this.accounts.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('service-account:update')
  @ApiOperation({ summary: 'Update a service account' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceAccountDto,
    @CurrentUser() actor: SessionUser,
  ): Promise<ServiceAccountDto> {
    return this.accounts.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('service-account:delete')
  @ApiOperation({ summary: 'Revoke a service account (key can no longer authenticate)' })
  revoke(@Param('id') id: string, @CurrentUser() actor: SessionUser): Promise<{ message: string }> {
    return this.accounts.revoke(id, actor);
  }
}
