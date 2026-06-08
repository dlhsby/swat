import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateSiteDto } from './dto/create-site.dto';
import { ListSitesQueryDto } from './dto/list-sites.query.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { type SiteDto, SitesService } from './sites.service';

@ApiTags('sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  @RequirePermissions('site:read')
  @ApiOperation({ summary: 'List sites (paginated)' })
  list(@Query() query: ListSitesQueryDto): Promise<{ data: SiteDto[]; meta: PaginationMeta }> {
    return this.sites.list(query);
  }

  @Get(':id')
  @RequirePermissions('site:read')
  @ApiOperation({ summary: 'Get a site by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<SiteDto> {
    return this.sites.getById(id);
  }

  @Post()
  @RequirePermissions('site:create')
  @ApiOperation({ summary: 'Create a site' })
  create(@Body() dto: CreateSiteDto): Promise<SiteDto> {
    return this.sites.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('site:update')
  @ApiOperation({ summary: 'Update a site' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSiteDto): Promise<SiteDto> {
    return this.sites.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('site:delete')
  @ApiOperation({ summary: 'Soft-delete a site' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.sites.remove(id);
  }
}
