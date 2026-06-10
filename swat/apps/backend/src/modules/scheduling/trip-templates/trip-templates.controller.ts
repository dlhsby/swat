import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { CreateTripTemplateDto, UpdateTripTemplateDto } from './dto/create-trip-template.dto';
import { type TripTemplateDto, TripTemplatesService } from './trip-templates.service';

@ApiTags('trip-templates')
@Controller('crew-schedules/:crewScheduleId/trip-templates')
export class TripTemplatesController {
  constructor(private readonly tripTemplates: TripTemplatesService) {}

  @Get()
  @RequirePermissions('trip-template:read')
  @ApiOperation({ summary: 'List trip templates for a crew schedule' })
  list(@Param('crewScheduleId') crewScheduleId: string): Promise<TripTemplateDto[]> {
    return this.tripTemplates.list(crewScheduleId);
  }

  @Post()
  @RequirePermissions('trip-template:create')
  @ApiOperation({ summary: 'Add a trip template to a crew schedule' })
  create(
    @Param('crewScheduleId') crewScheduleId: string,
    @Body() dto: CreateTripTemplateDto,
  ): Promise<TripTemplateDto> {
    return this.tripTemplates.create(crewScheduleId, dto);
  }

  @Patch(':templateId')
  @RequirePermissions('trip-template:update')
  @ApiOperation({ summary: 'Update a trip template' })
  update(
    @Param('crewScheduleId') crewScheduleId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTripTemplateDto,
  ): Promise<TripTemplateDto> {
    return this.tripTemplates.update(crewScheduleId, templateId, dto);
  }

  @Delete(':templateId')
  @RequirePermissions('trip-template:delete')
  @ApiOperation({ summary: 'Delete a trip template' })
  remove(
    @Param('crewScheduleId') crewScheduleId: string,
    @Param('templateId') templateId: string,
  ): Promise<{ message: string }> {
    return this.tripTemplates.remove(crewScheduleId, templateId);
  }
}
