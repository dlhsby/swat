import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PresignedPutDto {
  @ApiProperty({ description: 'Bucket-relative object key', example: 'trip/2026/06/abc.jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  key!: string;

  @ApiProperty({ description: 'MIME type of the object to upload', example: 'image/jpeg' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ required: false, description: 'URL lifetime in seconds (default 900)' })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresIn?: number;
}

export class PresignedGetDto {
  @ApiProperty({ description: 'Bucket-relative object key' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  key!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresIn?: number;
}

export interface PresignedUrlResponse {
  readonly url: string;
  readonly key: string;
  readonly expiresIn: number;
}
