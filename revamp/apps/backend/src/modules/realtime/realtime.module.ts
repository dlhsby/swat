import { Module } from '@nestjs/common';

import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

/**
 * Real-time delivery (Phase 7, Epic 7.4). An SSE gateway that bridges the GPS
 * Redis pub/sub channels to authenticated clients (the live map + alert center).
 * Config/Cache are global; only the gateway service + controller live here.
 */
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
