import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Breadcrumb window for the vehicle track endpoint (default 60 min, max 12h). */
export class TrackQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 720, default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  minutes = 60;
}
