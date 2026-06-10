import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type CrewScheduleDto, CrewSchedulesService } from './crew-schedules.service';
import {
  CreateCrewScheduleDto,
  ListCrewSchedulesQueryDto,
  UpdateCrewScheduleDto,
} from './dto/create-crew-schedule.dto';

@ApiTags('crew-schedules')
@Controller('crew-schedules')
export class CrewSchedulesController {
  constructor(private readonly crewSchedules: CrewSchedulesService) {}

  @Get()
  @RequirePermissions('crew-schedule:read')
  @ApiOperation({ summary: 'List crew schedules (paginated)' })
  list(
    @Query() query: ListCrewSchedulesQueryDto,
  ): Promise<{ data: CrewScheduleDto[]; meta: PaginationMeta }> {
    return this.crewSchedules.list(query);
  }

  @Get(':id')
  @RequirePermissions('crew-schedule:read')
  @ApiOperation({ summary: 'Get a crew schedule by id' })
  getById(@Param('id') id: string): Promise<CrewScheduleDto> {
    return this.crewSchedules.getById(id);
  }

  @Post()
  @RequirePermissions('crew-schedule:create')
  @ApiOperation({ summary: 'Create a crew schedule' })
  create(@Body() dto: CreateCrewScheduleDto): Promise<CrewScheduleDto> {
    return this.crewSchedules.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('crew-schedule:update')
  @ApiOperation({ summary: 'Update a crew schedule' })
  update(@Param('id') id: string, @Body() dto: UpdateCrewScheduleDto): Promise<CrewScheduleDto> {
    return this.crewSchedules.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crew-schedule:delete')
  @ApiOperation({ summary: 'Delete a crew schedule' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.crewSchedules.remove(id);
  }
}
