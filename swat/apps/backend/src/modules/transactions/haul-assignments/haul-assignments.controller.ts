import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type TripDto } from '../trips/trip.mapper';

import { RecordDepartDto } from './dto/record-depart.dto';
import { RecordReturnDto } from './dto/record-return.dto';
import { type HaulAssignmentDto } from './haul-assignment.mapper';
import { HaulAssignmentsService } from './haul-assignments.service';

@ApiTags('haul-assignments')
@Controller('haul-assignments')
export class HaulAssignmentsController {
  constructor(private readonly haulAssignments: HaulAssignmentsService) {}

  @Put(':id/record-depart')
  @RequirePermissions('trip:update')
  @ApiOperation({ summary: 'Record the departure leg of a haul assignment' })
  recordDepart(
    @Param('id') id: string,
    @Body() dto: RecordDepartDto,
    @CurrentUser() user: SessionUser,
  ): Promise<HaulAssignmentDto> {
    return this.haulAssignments.recordDepart(id, dto, user);
  }

  @Put(':id/record-return')
  @RequirePermissions('trip:update')
  @ApiOperation({
    summary: 'Record the return leg; closes the assignment and advances the odometer',
  })
  recordReturn(
    @Param('id') id: string,
    @Body() dto: RecordReturnDto,
    @CurrentUser() user: SessionUser,
  ): Promise<HaulAssignmentDto> {
    return this.haulAssignments.recordReturn(id, dto, user);
  }

  @Get(':id/trips')
  @RequirePermissions('trip:read')
  @ApiOperation({ summary: 'List the trips of a haul assignment' })
  listTrips(@Param('id') id: string): Promise<TripDto[]> {
    return this.haulAssignments.listTrips(id);
  }
}
