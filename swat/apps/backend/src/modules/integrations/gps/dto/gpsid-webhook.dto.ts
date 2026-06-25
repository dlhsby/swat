import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * One GPS.id push record (Phase 7, T-705). Field NAMES mirror the vendor payload
 * verbatim (every field is untrusted and validated here). A webhook call carries
 * either a single object or an array of these; the normalizer validates each item
 * independently and accepts the valid ones (a bad item is dropped, not a 422 for
 * the whole batch). `DatetimeUTC` is "YYYY-MM-DD HH:MM:SS" — treated as UTC
 * (vendor-named so; the UTC-vs-WIB question is verified during integration).
 */
export class GpsidWebhookItemDto {
  @IsString()
  @Matches(/^[0-9]{6,20}$/, { message: 'VehicleId (IMEI) harus 6–20 digit angka' })
  VehicleId!: string;

  @IsOptional()
  @IsString()
  VehicleNumber?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/, {
    message: 'DatetimeUTC harus format YYYY-MM-DD HH:MM:SS',
  })
  DatetimeUTC!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  Lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  Lon!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(300)
  Speed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(360)
  Direction?: number;

  @IsOptional()
  @IsIn(['ON', 'OFF', 'ACC ON', 'ACC OFF'])
  Engine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  Odometer?: number;

  @IsOptional()
  @IsIn(['START', 'STOP'])
  Car_Status?: string;

  @IsOptional()
  @IsString()
  VehicleType?: string;

  @IsOptional()
  @IsString()
  Alarm?: string;

  @IsOptional()
  @IsString()
  GpsLocation?: string;
}
