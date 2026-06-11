import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  CreateScheduleTemplateDto,
  ListScheduleTemplatesQueryDto,
  UpdateScheduleTemplateDto,
} from './dto/create-schedule-template.dto';
import { type ScheduleTemplateDto, ScheduleTemplatesService } from './schedule-templates.service';

@ApiTags('schedule-templates')
@Controller('schedule-templates')
export class ScheduleTemplatesController {
  constructor(private readonly scheduleTemplates: ScheduleTemplatesService) {}

  @Get()
  @RequirePermissions('schedule-template:read')
  @ApiOperation({ summary: 'List schedule templates (paginated)' })
  list(
    @Query() query: ListScheduleTemplatesQueryDto,
  ): Promise<{ data: ScheduleTemplateDto[]; meta: PaginationMeta }> {
    return this.scheduleTemplates.list(query);
  }

  @Get(':id')
  @RequirePermissions('schedule-template:read')
  @ApiOperation({ summary: 'Get a schedule template by id' })
  getById(@Param('id') id: string): Promise<ScheduleTemplateDto> {
    return this.scheduleTemplates.getById(id);
  }

  @Post()
  @RequirePermissions('schedule-template:create')
  @ApiOperation({ summary: 'Create a schedule template' })
  create(@Body() dto: CreateScheduleTemplateDto): Promise<ScheduleTemplateDto> {
    return this.scheduleTemplates.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('schedule-template:update')
  @ApiOperation({ summary: 'Update a schedule template' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleTemplateDto,
  ): Promise<ScheduleTemplateDto> {
    return this.scheduleTemplates.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('schedule-template:delete')
  @ApiOperation({ summary: 'Delete a schedule template' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.scheduleTemplates.remove(id);
  }
}
