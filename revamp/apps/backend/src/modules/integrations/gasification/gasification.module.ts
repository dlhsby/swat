import { Module } from '@nestjs/common';

import { StorageModule } from '../../storage/storage.module';

import { GasificationClientService } from './gasification-client.service';
import { GasificationPullJob } from './gasification-pull.job';
import { GasificationSyncService } from './gasification-sync.service';
import { GasificationController } from './gasification.controller';
import { GasificationRepository } from './gasification.repository';

/**
 * Gasification integration (PT Surveyor Indonesia). Polls the PTSI gasification-gate
 * API, matches records to DISPOSAL trips, downloads the capture photos to MinIO, and
 * exposes a review + manual-match API. PrismaService and SystemConfigService come
 * from their global modules; StorageModule is imported for photo storage.
 */
@Module({
  imports: [StorageModule],
  controllers: [GasificationController],
  providers: [
    GasificationClientService,
    GasificationRepository,
    GasificationSyncService,
    GasificationPullJob,
  ],
  exports: [GasificationSyncService],
})
export class GasificationModule {}
