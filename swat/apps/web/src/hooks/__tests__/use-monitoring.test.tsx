import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as MonitoringApi from '@/lib/monitoring-api';
import { renderHookWithProviders } from '@/test-utils/render';

import {
  useFuelConsumption,
  useKpiOverview,
  useLevySummary,
  useRoutesActive,
  useTonnage5Day,
  useTonnageBySite,
  useTonnageBySource,
} from '../use-monitoring';
import { useMonitoringRange } from '../use-monitoring-range';

const api = vi.hoisted(() => ({
  tonnage5Day: vi.fn(),
  tonnageBySource: vi.fn(),
  tonnageBySite: vi.fn(),
  fuelConsumption: vi.fn(),
  routesActive: vi.fn(),
  levySummary: vi.fn(),
  kpiOverview: vi.fn(),
}));

vi.mock('@/lib/monitoring-api', async (importOriginal) => {
  const actual = await importOriginal<typeof MonitoringApi>();
  return { ...actual, monitoringApi: api };
});

const RANGE = { dateFrom: '2026-06-01', dateTo: '2026-06-07' };

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe('monitoring data hooks', () => {
  it('useTonnage5Day returns the fetched rows', async () => {
    api.tonnage5Day.mockResolvedValue([{ date: '2026-06-01', totalTonnageKg: 4000 }]);
    const { result } = renderHookWithProviders(() => useTonnage5Day(RANGE));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ date: '2026-06-01', totalTonnageKg: 4000 }]);
    expect(api.tonnage5Day).toHaveBeenCalledWith(RANGE);
  });

  it('useTonnageBySource forwards the ownership filter', async () => {
    api.tonnageBySource.mockResolvedValue([]);
    const { result } = renderHookWithProviders(() => useTonnageBySource(RANGE, 'DINAS'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.tonnageBySource).toHaveBeenCalledWith(RANGE, 'DINAS');
  });

  it('useKpiOverview surfaces the overview object', async () => {
    api.kpiOverview.mockResolvedValue({ totalTonnageKg: 10000, vehiclesInOperation: 4 });
    const { result } = renderHookWithProviders(() => useKpiOverview(RANGE));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ vehiclesInOperation: 4 });
  });

  it('the remaining list hooks each resolve from their endpoint', async () => {
    api.tonnageBySite.mockResolvedValue([{ siteId: 1 }]);
    api.fuelConsumption.mockResolvedValue([{ vehicleId: 1 }]);
    api.routesActive.mockResolvedValue([{ routeId: 1 }]);
    api.levySummary.mockResolvedValue([{ categoryName: 'A' }]);

    const site = renderHookWithProviders(() => useTonnageBySite(RANGE));
    const fuel = renderHookWithProviders(() => useFuelConsumption(RANGE));
    const routes = renderHookWithProviders(() => useRoutesActive(RANGE));
    const levy = renderHookWithProviders(() => useLevySummary(RANGE));

    await waitFor(() => expect(site.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(fuel.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(routes.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(levy.result.current.isSuccess).toBe(true));

    expect(site.result.current.data).toEqual([{ siteId: 1 }]);
    expect(fuel.result.current.data).toEqual([{ vehicleId: 1 }]);
    expect(routes.result.current.data).toEqual([{ routeId: 1 }]);
    expect(levy.result.current.data).toEqual([{ categoryName: 'A' }]);
  });

  it('surfaces an error when the endpoint rejects', async () => {
    api.tonnage5Day.mockRejectedValue(new Error('boom'));
    const { result } = renderHookWithProviders(() => useTonnage5Day(RANGE));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useMonitoringRange', () => {
  it('defaults to the trailing seven days', () => {
    const { result } = renderHookWithProviders(() => useMonitoringRange());
    const { range, today } = result.current;
    // dateTo is today; dateFrom is six days earlier (inclusive 7-day window).
    expect(range.dateTo).toBe(today);
    expect(range.dateFrom < range.dateTo).toBe(true);
  });

  it('updates the range through its setter', () => {
    const { result } = renderHookWithProviders(() => useMonitoringRange());
    const next = { dateFrom: '2026-01-01', dateTo: '2026-01-31' };
    act(() => result.current.setRange(next));
    expect(result.current.range).toEqual(next);
  });
});
