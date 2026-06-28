import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type PaginationMeta } from '../../../common/types/api-response';
import { CurrentPrincipal } from '../decorators/current-principal.decorator';
import { WeighbridgeAuth } from '../decorators/weighbridge-auth.decorator';
import { ApiAuditInterceptor } from '../interceptors/api-audit.interceptor';
import { type ApiPrincipal } from '../types/principal';

import { ListWeighingsQueryDto } from './dto/list-weighings.query.dto';
import { PostWeighingDto } from './dto/post-weighing.dto';
import { ResolveKitirDto } from './dto/resolve-kitir.dto';
import { UpdateWeighingDto } from './dto/update-weighing.dto';
import { WeighbridgeService } from './weighbridge.service';
import {
  type ResolvedKitir,
  type WeighingListItem,
  type WeighingResult,
} from './weighbridge.types';
import { type WeighingImportSummary, WeighingImportService } from './weighing-import.service';

/** Minimal shape of a multer upload (no `@types/multer` dependency needed). */
interface UploadedExcel {
  readonly buffer: Buffer;
  readonly originalname: string;
}

/**
 * Weighbridge integration API (Phase 4) for the TPA "Jembatan Timbang" desktop
 * app. Every route is protected by {@link WeighbridgeAuth} — an interactive
 * operator (OAuth2 bearer / session, with the relevant `weighbridge:*` permission)
 * OR a machine ServiceAccount API key. All calls are rate-limited and audited.
 */
@ApiTags('weighbridge')
@Controller('weighbridge')
@UseInterceptors(ApiAuditInterceptor)
export class WeighbridgeController {
  constructor(
    private readonly weighbridge: WeighbridgeService,
    private readonly weighingImport: WeighingImportService,
  ) {}

  @Post('resolve-kitir')
  @HttpCode(200)
  @WeighbridgeAuth('weighbridge:resolve')
  @ApiOperation({ summary: 'Resolve a kitir by code or plate → vehicle specs + tare' })
  resolveKitir(@Body() dto: ResolveKitirDto): Promise<ResolvedKitir> {
    return this.weighbridge.resolveKitir(dto);
  }

  @Post('post-weighing')
  @WeighbridgeAuth('weighbridge:post')
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'UUID for safe retries' })
  @ApiOperation({ summary: 'Post a weighing → create/update DISPOSAL trip + inbound log' })
  postWeighing(
    @Body() dto: PostWeighingDto,
    @CurrentPrincipal() principal: ApiPrincipal,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<WeighingResult> {
    return this.weighbridge.postWeighing(dto, principal, idempotencyKey?.trim() || undefined);
  }

  @Patch('weighings/:tripId')
  @WeighbridgeAuth('weighbridge:update')
  @ApiOperation({ summary: 'Update / verify an existing weighing (idempotent)' })
  updateWeighing(
    @Param('tripId') tripId: string,
    @Body() dto: UpdateWeighingDto,
    @CurrentPrincipal() principal: ApiPrincipal,
  ): Promise<WeighingResult> {
    return this.weighbridge.updateWeighing(tripId, dto, principal);
  }

  @Get('weighings')
  @WeighbridgeAuth('weighbridge:read')
  @ApiOperation({ summary: 'List recorded weighings (filter by date/plate/site)' })
  listWeighings(
    @Query() query: ListWeighingsQueryDto,
  ): Promise<{ data: WeighingListItem[]; meta: PaginationMeta }> {
    return this.weighbridge.listWeighings(query);
  }

  @Post('import-excel')
  @WeighbridgeAuth('weighbridge:post')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk-import weighings from an Excel file (parity G14)' })
  importExcel(@UploadedFile() file?: UploadedExcel): Promise<WeighingImportSummary> {
    if (!file?.buffer) {
      throw new BadRequestException('Berkas Excel wajib diunggah pada field "file"');
    }
    return this.weighingImport.importExcel(file.buffer);
  }
}
