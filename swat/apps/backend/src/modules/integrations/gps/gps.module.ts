import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { bullRedisConnection } from '../../../common/bull/bull-connection';
import { AppConfigModule } from '../../../config';
import { AppConfigService } from '../../../config/config.service';
import { ApiAuditService } from '../api-audit.service';

import { GpsDeviceOfflineJob } from './gps-device-offline.job';
import { GpsDeviceController } from './gps-device.controller';
import { GpsDeviceRepository } from './gps-device.repository';
import { GpsDeviceService } from './gps-device.service';
import { GpsIngestQueue } from './gps-ingest.queue';
import { GpsIngestWorker } from './gps-ingest.worker';
import { GpsPingRepository } from './gps-ping.repository';
import { GpsPositionPublisher } from './gps-position.publisher';
import { GpsWebhookController } from './gps-webhook.controller';
import { GpsWebhookGuard } from './gps-webhook.guard';
import { GPS_INGEST_QUEUE } from './gps.types';
import { GpsidClientService } from './gpsid-client.service';

/**
 * GPS tracking & route-deviation monitoring (Phase 7).
 *
 * Registers the shared `gps-ingest` BullMQ queue + its Redis connection and the
 * device registry (T-704). The GPS.id webhook (T-705), ingest worker +
 * device-offline sweep (T-706) and the GPS.id pull client (T-707) register their
 * controllers/services here as they land. Imported by IntegrationsModule.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: bullRedisConnection(config.redisUrl),
      }),
    }),
    BullModule.registerQueue({ name: GPS_INGEST_QUEUE }),
  ],
  controllers: [GpsDeviceController, GpsWebhookController],
  providers: [
    GpsDeviceService,
    GpsDeviceRepository,
    GpsIngestQueue,
    GpsIngestWorker,
    GpsPingRepository,
    GpsPositionPublisher,
    GpsDeviceOfflineJob,
    GpsidClientService,
    GpsWebhookGuard,
    // Own ApiAuditService instance (stateless — just Prisma writes): GpsModule is
    // imported BY IntegrationsModule, so it cannot inject that module's provider.
    ApiAuditService,
  ],
})
export class GpsModule {}
