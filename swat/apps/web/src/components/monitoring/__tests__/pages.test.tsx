import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FuelPage from '@/app/[locale]/(app)/monitoring/fuel/page';
import LevyPage from '@/app/[locale]/(app)/monitoring/levy/page';
import RoutesPage from '@/app/[locale]/(app)/monitoring/routes/page';
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
  levyTrend: vi.fn(),
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
      { wasteSourceId: 1, code: 'D', name: 'Dinas', totalTonnageKg: 7000, haulCount: 5 },
      { wasteSourceId: 2, code: 'PS', name: 'Pasar', totalTonnageKg: 3000, haulCount: 2 },
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
  it('Ringkasan tab shows the total KPI + both chart cards, with no transaksi stat', async () => {
    api.levySummary.mockResolvedValue([
      {
        categoryName: 'Rumah Tangga',
        totalAmount: 8500000,
        transactionCount: 17,
        avgPerTransaction: 500000,
      },
      {
        categoryName: 'Komersial',
        totalAmount: 1500000,
        transactionCount: 3,
        avgPerTransaction: 500000,
      },
    ]);
    api.levyTrend.mockResolvedValue([
      { month: '2026-05', totalAmount: 4000000 },
      { month: '2026-06', totalAmount: 6000000 },
    ]);

    renderWithProviders(<LevyPage />);

    // Total Retribusi KPI = sum of category totals (8.5jt + 1.5jt = 10jt).
    expect(screen.getByText('Total Retribusi')).toBeInTheDocument();
    expect(await screen.findByText(/Rp\s?10\.000\.000/)).toBeInTheDocument();

    // Both chart cards render; the dropped transaction stat is gone.
    expect(screen.getByText('Retribusi per Kategori')).toBeInTheDocument();
    expect(screen.getByText('Tren Retribusi Bulanan')).toBeInTheDocument();
    expect(screen.queryByText('Transaksi')).not.toBeInTheDocument();

    // Tabs expose Ringkasan + Data.
    expect(screen.getByRole('tab', { name: /ringkasan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /data/i })).toBeInTheDocument();
  });
});
