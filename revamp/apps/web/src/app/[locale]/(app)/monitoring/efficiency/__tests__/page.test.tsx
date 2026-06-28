import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import EfficiencyPage from '../page';

vi.mock('@/hooks/use-monitoring-range', () => ({
  useMonitoringRange: () => ({
    range: { dateFrom: '2026-06-01', dateTo: '2026-06-30' },
    setRange: vi.fn(),
    today: '2026-06-30',
  }),
}));

vi.mock('@/hooks/use-efficiency', () => ({
  useEfficiency: () => ({
    data: {
      kpis: {
        adherencePct: null,
        wastedFuelLiters: 4.1,
        gpsidFuelLiters: null,
        lateMinutes: 20,
        deviationCount: 2,
        distanceKm: 28,
        gpsCoverageRate: 0.5,
        deviceOnline: 8,
        deviceOffline: 2,
        deviceOfflineRate: 0.2,
      },
      rows: [
        {
          date: '2026-06-25',
          vehicleId: 'v1',
          plate: 'L 1234 AB',
          positionSource: 'gps',
          plannedMeters: 5000,
          actualMeters: 8000,
          adherencePct: null,
          dwellMinutes: null,
          lateMinutes: 20,
          wastedFuelLiters: 0.6,
          gpsidFuelLiters: null,
          deviationCount: 2,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

describe('EfficiencyPage', () => {
  it('renders KPIs and the per-vehicle row', () => {
    renderWithProviders(<EfficiencyPage />);
    expect(screen.getByText('BBM terbuang')).toBeInTheDocument();
    expect(screen.getByText('Cakupan GPS')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // coverage rate
    expect(screen.getAllByText('L 1234 AB').length).toBeGreaterThan(0);
  });
});
