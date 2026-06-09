import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FuelPage from '@/app/[locale]/(app)/monitoring/bbm/page';
import LevyPage from '@/app/[locale]/(app)/monitoring/retribusi/page';
import RoutesPage from '@/app/[locale]/(app)/monitoring/rute/page';
import VolumePage from '@/app/[locale]/(app)/monitoring/volume/page';
import type * as MonitoringApi from '@/lib/monitoring-api';
import { renderWithProviders } from '@/test-utils/render';

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

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue([]));
});

describe('VolumePage', () => {
  it('renders KPIs, the source donut legend, the site table, and reconciliation badges', async () => {
    api.tonnage5Day.mockResolvedValue([
      {
        date: '2026-06-01',
        totalTonnageKg: 4000,
        haulCount: 3,
        tpaInboundKg: 4000,
        reconciliationStatus: 'MATCHED',
      },
      {
        date: '2026-06-02',
        totalTonnageKg: 6000,
        haulCount: 5,
        tpaInboundKg: null,
        reconciliationStatus: 'PENDING',
      },
    ]);
    api.tonnageBySource.mockResolvedValue([
      {
        wasteSourceId: 1,
        code: 'D',
        name: 'Dinas',
        ownership: 'DINAS',
        totalTonnageKg: 7000,
        haulCount: 5,
      },
      {
        wasteSourceId: 2,
        code: 'PS',
        name: 'Pasar',
        ownership: 'SWASTA',
        totalTonnageKg: 3000,
        haulCount: 2,
      },
    ]);
    api.tonnageBySite.mockResolvedValue([
      { siteId: 1, name: 'TPS Mawar', type: 'TPS', totalTonnageKg: 7000, haulCount: 5 },
    ]);

    renderWithProviders(<VolumePage />);

    // DataTable renders a desktop table + a mobile card view, so cell text appears
    // more than once — assert presence, not uniqueness.
    expect((await screen.findAllByText('TPS Mawar')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pasar').length).toBeGreaterThan(0); // donut legend
    expect(screen.getAllByText('Sesuai').length).toBeGreaterThan(0); // MATCHED badge
    expect(screen.getAllByText('Menunggu').length).toBeGreaterThan(0); // PENDING badge
    expect(screen.getAllByText(/diagregasi per bulan/i).length).toBeGreaterThan(0); // month note
  });
});

describe('FuelPage', () => {
  it('renders the per-vehicle variance table with flags', async () => {
    api.fuelConsumption.mockResolvedValue([
      {
        vehicleId: 9,
        plateNumber: 'L 9 ZZ',
        fuelApprovedLiters: 80,
        fuelRequestedLiters: 100,
        variancePercent: -20,
        flag: 'RED',
      },
    ]);

    renderWithProviders(<FuelPage />);

    expect((await screen.findAllByText('L 9 ZZ')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('-20%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Anomali').length).toBeGreaterThan(0); // RED flag badge
  });
});

describe('RoutesPage', () => {
  it('renders the active-routes table and the monthly-grain note', async () => {
    api.routesActive.mockResolvedValue([
      {
        routeId: 1,
        category: 'DISPOSAL',
        originSiteName: 'TPS Mawar',
        destinationSiteName: 'TPA Benowo',
        distanceKm: 12,
        tripCount: 9,
      },
    ]);

    renderWithProviders(<RoutesPage />);

    expect((await screen.findAllByText('TPS Mawar → TPA Benowo')).length).toBeGreaterThan(0);
    expect(screen.getByText(/diagregasi per bulan/i)).toBeInTheDocument();
  });
});

describe('LevyPage', () => {
  it('renders the levy category table in IDR and the legacy-data note', async () => {
    api.levySummary.mockResolvedValue([
      {
        categoryName: 'Rumah Tangga',
        totalAmount: 8500000,
        transactionCount: 17,
        avgPerTransaction: 500000,
      },
    ]);

    renderWithProviders(<LevyPage />);

    expect((await screen.findAllByText('Rumah Tangga')).length).toBeGreaterThan(0);
    // formatRupiah renders the dotted-thousands IDR form (KPI card + table cell).
    expect(screen.getAllByText(/Rp\s?8\.500\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/migrasi data lama/i)).toBeInTheDocument();
  });
});
