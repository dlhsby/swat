import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { ListRefuelsQueryDto } from './dto/list-refuels.query.dto';
import { type RefuelDto, RefuelsService } from './refuels.service';

@ApiTags('refuels')
@Controller('refuels')
export class RefuelsController {
  constructor(private readonly refuels: RefuelsService) {}

  @Get()
  @RequirePermissions('trip:read')
  @ApiOperation({ summary: 'List refuel trips with derived cost + anomaly flag (read view)' })
  list(@Query() query: ListRefuelsQueryDto): Promise<{ data: RefuelDto[]; meta: PaginationMeta }> {
    return this.refuels.list(query);
  }
}
