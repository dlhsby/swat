import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { DateRangeQueryDto } from './date-range.query.dto';

/** Time-bucket granularity for the trend endpoints (maps to Postgres `date_trunc`). */
export const TIME_BUCKETS = ['day', 'month', 'year'] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

/**
 * A `dateFrom`/`dateTo` window plus an optional `bucket` granularity, feeding the
 * harian / bulanan / tahunan trend charts. Defaults to `day` when omitted.
 */
export class BucketRangeQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    enum: TIME_BUCKETS,
    description: 'Time-bucket granularity (day | month | year). Defaults to day.',
  })
  @IsOptional()
  @IsIn(TIME_BUCKETS, { message: 'bucket harus day, month, atau year.' })
  bucket?: TimeBucket;
}
