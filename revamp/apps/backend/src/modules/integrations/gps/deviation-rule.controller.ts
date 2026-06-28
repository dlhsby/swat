import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { type DeviationRuleDto, DeviationRuleService } from './deviation-rule.service';
import { UpsertDeviationRuleDto } from './dto/upsert-deviation-rule.dto';

/**
 * Deviation-rule tuning (Phase 7, T-709). One rule per deviation type; an operator
 * nudges thresholds / hysteresis / severity or toggles a rule. Gated by
 * `deviation-rule:manage`.
 */
@ApiTags('gps-deviation-rules')
@Controller('gps/deviation-rules')
export class DeviationRuleController {
  constructor(private readonly rules: DeviationRuleService) {}

  @Get()
  @RequirePermissions('deviation-rule:manage')
  @ApiOperation({ summary: 'List deviation rules' })
  list(): Promise<DeviationRuleDto[]> {
    return this.rules.list();
  }

  @Put(':type')
  @RequirePermissions('deviation-rule:manage')
  @ApiOperation({ summary: 'Tune a deviation rule by type' })
  upsert(
    @Param('type') type: string,
    @Body() dto: UpsertDeviationRuleDto,
  ): Promise<DeviationRuleDto> {
    return this.rules.upsert(type, dto);
  }
}
