import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { bullRedisConnection } from '../../../common/bull/bull-connection';
import { AppConfigModule } from '../../../config';
import { AppConfigService } from '../../../config/config.service';

import { GpsDeviceController } from './gps-device.controller';
import { GpsDeviceRepository } from './gps-device.repository';
import { GpsDeviceService } from './gps-device.service';
import { GPS_INGEST_QUEUE } from './gps.types';

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
  controllers: [GpsDeviceController],
  providers: [GpsDeviceService, GpsDeviceRepository],
})
export class GpsModule {}
