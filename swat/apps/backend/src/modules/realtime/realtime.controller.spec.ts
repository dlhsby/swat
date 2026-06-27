import { type MessageEvent } from '@nestjs/common';
import { Subject, type Subscription } from 'rxjs';

import { RealtimeController } from './realtime.controller';
import { type RealtimeEvent, type RealtimeService } from './realtime.service';

describe('RealtimeController', () => {
  let stream$: Subject<RealtimeEvent>;
  let controller: RealtimeController;

  beforeEach(() => {
    stream$ = new Subject<RealtimeEvent>();
    const realtime = { stream: () => stream$.asObservable() };
    controller = new RealtimeController(realtime as unknown as RealtimeService);
  });

  it('maps positions and alerts to typed SSE events', () => {
    const out: MessageEvent[] = [];
    const sub: Subscription = controller.fleet().subscribe((e) => out.push(e));

    stream$.next({ channel: 'gps:positions', payload: { vehicleId: 'v1', latitude: -7.25 } });
    stream$.next({ channel: 'gps:alerts', payload: { vehicleId: 'v1', id: 'a1' } });

    expect(out).toEqual([
      { type: 'position', data: JSON.stringify({ vehicleId: 'v1', latitude: -7.25 }) },
      { type: 'alert', data: JSON.stringify({ vehicleId: 'v1', id: 'a1' }) },
    ]);
    sub.unsubscribe();
  });

  it('filters to a single vehicle when vehicleId is given', () => {
    const out: MessageEvent[] = [];
    const sub = controller.fleet('v2').subscribe((e) => out.push(e));

    stream$.next({ channel: 'gps:positions', payload: { vehicleId: 'v1' } });
    stream$.next({ channel: 'gps:positions', payload: { vehicleId: 'v2' } });

    expect(out).toEqual([{ type: 'position', data: JSON.stringify({ vehicleId: 'v2' }) }]);
    sub.unsubscribe();
  });
});
