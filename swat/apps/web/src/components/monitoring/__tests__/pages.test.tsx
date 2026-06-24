import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FuelPage from '@/app/[locale]/(app)/monitoring/fuel/page';
import HaulingPage from '@/app/[locale]/(app)/monitoring/hauling/page';
import LevyPage from '@/app/[locale]/(app)/monitoring/levy/page';
import VolumePage from '@/app/[locale]/(app)/monitoring/volume/page';
import type * as MonitoringApi from '@/lib/monitoring-api';
import { renderWithProviders } from '@/test-utils/render';

const api = vi.hoisted(() => ({
  tonnage5Day: vi.fn(),
  tonnageMonthly: vi.fn(),
  tonnageBySource: vi.fn(),
  tonnageBySite: vi.fn(),
  fuelConsumption: vi.fn(),
  fuelByType: vi.fn(),
  routesActive: vi.fn(),
  routeMap: vi.fn(),
  tripSummary: vi.fn(),
  levySummary: vi.fn(),
  levyTrend: vi.fn(),
  kpiOverview: vi.fn(),
}));

vi.mock('@/lib/monitoring-api', async (importOriginal) => {
  const actual = await importOriginal<typeof MonitoringApi>();
  return { ...actual, monitoringApi: api };
});

// The embedded ExportMenu is permission-gated (usePermissions → useAuth). These
// page tests render outside an AuthProvider, so stub the permission hook to grant
// access — the export control is exercised separately.
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: [],
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  }),
}));

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue([]));
  // Object-shaped endpoints need their own default (not the [] array default).
  api.routeMap.mockResolvedValue({ sites: [], edges: [] });
  api.tripSummary.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100 } });
});

describe('VolumePage', () => {
  it('renders KPIs, the source donut legend, the daily table, and the by-site recap', async () => {
    api.tonnage5Day.mockResolvedValue([
      { date: '2026-06-01', totalTonnageKg: 4000, haulCount: 3, tpaInboundKg: 4000 },
      { date: '2026-06-02', totalTonnageKg: 6000, haulCount: 5, tpaInboundKg: null },
    ]);
    api.tonnageBySource.mockResolvedValue([
      { wasteSourceId: 1, code: 'D', name: 'Dinas', totalTonnageKg: 7000, haulCount: 5 },
      { wasteSourceId: 2, code: 'PS', name: 'Pasar', totalTonnageKg: 3000, haulCount: 2 },
    ]);
    api.tonnageBySite.mockResolvedValue([
      { siteId: 1, name: 'TPS Mawar', type: 'TPS', totalTonnageKg: 7000, haulCount: 5 },
    ]);

    renderWithProviders(<VolumePage />);

    // Summary tab (default): donut legend + month note.
    // DataTable renders a desktop table + a mobile card view, so cell text appears
    // more than once — assert presence, not uniqueness.
    expect((await screen.findAllByText('Pasar')).length).toBeGreaterThan(0); // donut legend
    expect(screen.getAllByText(/diagregasi per bulan/i).length).toBeGreaterThan(0); // month note

    // The per-site recap table lives under the "Per Sumber & TPS" tab.
    await userEvent.click(screen.getByRole('tab', { name: /per sumber/i }));
    expect((await screen.findAllByText('TPS Mawar')).length).toBeGreaterThan(0);
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

describe('HaulingPage', () => {
  it('renders KPIs + tabs, and the route recap table once its tab is active', async () => {
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

    renderWithProviders(<HaulingPage />);

    // KPI + the three domain tabs render on the default (map) view.
    expect(await screen.findByText('Rute Aktif')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /peta/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /operasional/i })).toBeInTheDocument();
    const recapTab = screen.getByRole('tab', { name: /rekap/i });
    expect(recapTab).toBeInTheDocument();

    // Switch to the recap tab; the active-routes table + monthly note appear.
    await userEvent.click(recapTab);
    expect((await screen.findAllByText('TPS Mawar → TPA Benowo')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/diagregasi per bulan/i).length).toBeGreaterThan(0);
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
