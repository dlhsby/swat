import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { CreateTripTemplateDto, UpdateTripTemplateDto } from './dto/create-trip-template.dto';
import { type TripTemplateDto, TripTemplatesService } from './trip-templates.service';

@ApiTags('trip-templates')
@Controller('schedule-templates/:scheduleTemplateId/trip-templates')
export class TripTemplatesController {
  constructor(private readonly tripTemplates: TripTemplatesService) {}

  @Get()
  @RequirePermissions('trip-template:read')
  @ApiOperation({ summary: 'List trip templates for a schedule template' })
  list(@Param('scheduleTemplateId') scheduleTemplateId: string): Promise<TripTemplateDto[]> {
    return this.tripTemplates.list(scheduleTemplateId);
  }

  @Post()
  @RequirePermissions('trip-template:create')
  @ApiOperation({ summary: 'Add a trip template to a schedule template' })
  create(
    @Param('scheduleTemplateId') scheduleTemplateId: string,
    @Body() dto: CreateTripTemplateDto,
  ): Promise<TripTemplateDto> {
    return this.tripTemplates.create(scheduleTemplateId, dto);
  }

  @Patch(':templateId')
  @RequirePermissions('trip-template:update')
  @ApiOperation({ summary: 'Update a trip template' })
  update(
    @Param('scheduleTemplateId') scheduleTemplateId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTripTemplateDto,
  ): Promise<TripTemplateDto> {
    return this.tripTemplates.update(scheduleTemplateId, templateId, dto);
  }

  @Delete(':templateId')
  @RequirePermissions('trip-template:delete')
  @ApiOperation({ summary: 'Delete a trip template' })
  remove(
    @Param('scheduleTemplateId') scheduleTemplateId: string,
    @Param('templateId') templateId: string,
  ): Promise<{ message: string }> {
    return this.tripTemplates.remove(scheduleTemplateId, templateId);
  }
}
