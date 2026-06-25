import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviationSeverity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Tune a deviation rule (T-709). The rule is identified by its type in the path;
 * every field is optional so an operator can nudge just the threshold or toggle it.
 */
export class UpsertDeviationRuleDto {
  @ApiPropertyOptional({ minimum: 0, description: 'Metres or seconds, per the rule type' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86_400)
  threshold?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 3600, default: 30, description: 'Debounce (s)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  hysteresisSec?: number;

  @ApiPropertyOptional({ enum: DeviationSeverity })
  @IsOptional()
  @IsEnum(DeviationSeverity)
  severity?: DeviationSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
