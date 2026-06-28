import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test-utils/render';

import { useLiveFleet } from '../use-live-fleet';

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, (e: { data: string }) => void> = {};
  closed = false;
  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (e: { data: string }) => void): void {
    this.listeners[type] = cb;
  }
  close(): void {
    this.closed = true;
  }
  emit(type: string, data: string): void {
    this.listeners[type]?.({ data });
  }
}

describe('useLiveFleet', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });
  afterEach(() => vi.unstubAllGlobals());

  function current() {
    return MockEventSource.instances[0]!;
  }

  it('opens a stream and reflects the connection state', () => {
    const { result } = renderHookWithProviders(() => useLiveFleet());
    expect(result.current.connectionState).toBe('connecting');
    act(() => current().emit('open', ''));
    expect(result.current.connectionState).toBe('open');
  });

  it('accumulates the latest position per vehicle', () => {
    const { result } = renderHookWithProviders(() => useLiveFleet());
    act(() => current().emit('position', JSON.stringify({ vehicleId: 'v1', latitude: -7.25 })));
    act(() => current().emit('position', JSON.stringify({ vehicleId: 'v1', latitude: -7.3 })));
    act(() => current().emit('position', JSON.stringify({ vehicleId: 'v2', latitude: -7.1 })));
    expect(result.current.positions.size).toBe(2);
    expect(result.current.positions.get('v1')?.latitude).toBe(-7.3);
  });

  it('prepends alerts (most-recent first)', () => {
    const { result } = renderHookWithProviders(() => useLiveFleet());
    act(() => current().emit('alert', JSON.stringify({ id: 'a1', vehicleId: 'v1' })));
    act(() => current().emit('alert', JSON.stringify({ id: 'a2', vehicleId: 'v1' })));
    expect(result.current.alerts.map((a) => a.id)).toEqual(['a2', 'a1']);
  });

  it('passes vehicleId into the stream URL', () => {
    renderHookWithProviders(() => useLiveFleet({ vehicleId: 'v9' }));
    expect(current().url).toContain('vehicleId=v9');
  });

  it('is closed when disabled', () => {
    const { result } = renderHookWithProviders(() => useLiveFleet({ enabled: false }));
    expect(result.current.connectionState).toBe('closed');
    expect(MockEventSource.instances).toHaveLength(0);
  });
});
