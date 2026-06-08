import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  PresignedGetDto,
  PresignedPutDto,
  type PresignedUrlResponse,
} from './dto/presigned-url.dto';
import { StorageService } from './storage.service';

const DEFAULT_EXPIRY = 900;

/**
 * Presigned-URL endpoints. Phase 1 will guard these with auth + permissions;
 * for now they expose the storage round-trip used by the upload flow.
 */
@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('presigned-put')
  @ApiOperation({ summary: 'Get a presigned URL to upload an object' })
  async presignPut(@Body() dto: PresignedPutDto): Promise<PresignedUrlResponse> {
    const expiresIn = dto.expiresIn ?? DEFAULT_EXPIRY;
    const url = await this.storage.getPresignedPutUrl(dto.key, dto.contentType, expiresIn);
    return { url, key: dto.key, expiresIn };
  }

  @Post('presigned-get')
  @ApiOperation({ summary: 'Get a presigned URL to download an object' })
  async presignGet(@Body() dto: PresignedGetDto): Promise<PresignedUrlResponse> {
    const expiresIn = dto.expiresIn ?? DEFAULT_EXPIRY;
    const url = await this.storage.getPresignedGetUrl(dto.key, expiresIn);
    return { url, key: dto.key, expiresIn };
  }
}
