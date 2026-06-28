import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Register a photo already uploaded to object storage against a trip (legacy
 * `dokumentasitrayek`). The client first gets a presigned PUT URL from
 * `/storage/presigned-put`, uploads the bytes directly, then posts this metadata.
 */
export class AttachTripPhotoDto {
  @ApiProperty({ description: 'Object key returned to the presigned-put flow', maxLength: 512 })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  objectKey!: string;

  @ApiProperty({ example: 'image/jpeg', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ minimum: 1, description: 'Object size in bytes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiProperty({ description: 'Content checksum (e.g. md5/sha256 hex)', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  checksum!: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;
}
