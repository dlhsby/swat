import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../api-client';
import { monitoringApi, monitoringQuery } from '../monitoring-api';

vi.mock('../api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue([]) } }));

const RANGE = { dateFrom: '2026-06-01', dateTo: '2026-06-30' };

describe('monitoringQuery', () => {
  it('serialises the date range and omits empty extras', () => {
    expect(monitoringQuery(RANGE)).toBe('dateFrom=2026-06-01&dateTo=2026-06-30');
    expect(monitoringQuery(RANGE, { group: undefined })).toBe(
      'dateFrom=2026-06-01&dateTo=2026-06-30',
    );
    expect(monitoringQuery(RANGE, { group: 'NON_SWASTA' })).toBe(
      'dateFrom=2026-06-01&dateTo=2026-06-30&group=NON_SWASTA',
    );
  });
});

describe('monitoringApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the tonnage-by-source endpoint with the source-group filter', async () => {
    await monitoringApi.tonnageBySource(RANGE, 'SWASTA');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/monitoring/tonnage-by-source?dateFrom=2026-06-01&dateTo=2026-06-30&group=SWASTA',
    );
  });

  it('requests the kpi-overview endpoint', async () => {
    await monitoringApi.kpiOverview(RANGE);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/monitoring/kpi-overview?dateFrom=2026-06-01&dateTo=2026-06-30',
    );
  });

  it('requests the levy-summary endpoint', async () => {
    await monitoringApi.levySummary(RANGE);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/monitoring/levy-summary?dateFrom=2026-06-01&dateTo=2026-06-30',
    );
  });
});
