import { Controller, type MessageEvent, Query, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Observable, filter, interval, map, merge } from 'rxjs';

import { RawResponse } from '../../common/decorators/raw-response.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { GPS_ALERTS_CHANNEL } from '../integrations/gps/gps.types';

import { RealtimeService } from './realtime.service';

const HEARTBEAT_MS = 15_000;

/**
 * Live fleet stream (Phase 7, T-715). Server-Sent Events — one-way fits positions
 * + alerts. Session-authed + `tracking:read` (the global guards apply; EventSource
 * carries the session cookie). `@RawResponse` keeps the envelope interceptor off
 * the stream. A periodic heartbeat keeps the connection alive through proxies.
 * Optional `?vehicleId=` narrows to one vehicle.
 */
@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse('fleet')
  @RequirePermissions('tracking:read')
  @RawResponse()
  @ApiOperation({ summary: 'SSE stream of live vehicle positions + deviation alerts' })
  fleet(@Query('vehicleId') vehicleId?: string): Observable<MessageEvent> {
    const events$ = this.realtime.stream().pipe(
      filter((e) => !vehicleId || e.payload.vehicleId === vehicleId),
      map(
        (e): MessageEvent => ({
          type: e.channel === GPS_ALERTS_CHANNEL ? 'alert' : 'position',
          data: JSON.stringify(e.payload),
        }),
      ),
    );
    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: '{}' })),
    );
    return merge(events$, heartbeat$);
  }
}
