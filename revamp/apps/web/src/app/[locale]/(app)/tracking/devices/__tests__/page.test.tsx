import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type * as GpsDeviceApi from '@/lib/gps-device-api';
import { renderWithProviders } from '@/test-utils/render';

import GpsDevicesPage from '../page';

// ProtectedAction → usePermissions → useAuth → @/providers/auth-provider, which
// pulls in @/i18n/navigation (next-intl's createNavigation) — that fails to
// resolve under vitest's ESM setup. Mock the permission check directly instead
// of the whole auth provider; every action here should render as allowed.
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: ['*:*'],
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  }),
}));

const DEVICE = {
  id: 'd1',
  vehicleId: 'v1',
  vehiclePlate: 'L 1234 AB',
  deviceType: 'gps-hardware' as const,
  deviceId: '860121060518548',
  imei: '860121060518548',
  provider: 'gpsid',
  priority: 0,
  active: true,
  status: 'online' as const,
  lastPingAt: '2026-07-05T06:10:08.000Z',
  lastLat: -7.21791,
  lastLng: 112.66126,
  lastSpeedKmh: 0,
  lastHeading: null,
  createdAt: '2026-07-04T05:06:45.164Z',
  updatedAt: '2026-07-05T13:26:40.071Z',
};

const reload = vi.fn();
vi.mock('@/hooks/use-resource-manager', () => ({
  useResourceManager: () => ({
    rows: [DEVICE],
    loading: false,
    error: false,
    reload,
    editing: null,
    readOnly: false,
    dialogOpen: false,
    setDialogOpen: vi.fn(),
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    openView: vi.fn(),
    saving: false,
    submit: vi.fn(),
    deleteTarget: null,
    setDeleteTarget: vi.fn(),
    deleting: false,
    confirmDelete: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-resource-list', () => ({
  useResourceList: () => ({ rows: [], loading: false, error: false, reload: vi.fn() }),
}));

const { pullDevicePosition, pullAllDevicePositions } = vi.hoisted(() => ({
  pullDevicePosition: vi.fn().mockResolvedValue({
    enqueued: 1000,
    latest: {
      latitude: -7.27406,
      longitude: 112.63714,
      speedKmh: 0,
      recordedAt: '2026-07-05T05:16:23.000Z',
    },
  }),
  pullAllDevicePositions: vi
    .fn()
    .mockResolvedValue({ totalDevices: 5, pulled: 5, enqueued: 200, rateLimited: 0 }),
}));

vi.mock('@/lib/gps-device-api', async (importOriginal) => {
  const actual = await importOriginal<typeof GpsDeviceApi>();
  return { ...actual, pullDevicePosition, pullAllDevicePositions };
});

describe('GpsDevicesPage', () => {
  it('exposes "Tarik Posisi" inside the row kebab and reloads on success', async () => {
    renderWithProviders(<GpsDevicesPage />);

    await userEvent.click(screen.getAllByRole('button', { name: 'Aksi' })[0]!);
    await userEvent.click(await screen.findByText('Tarik Posisi'));

    expect(pullDevicePosition).toHaveBeenCalledWith('d1');
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it('pulls all device positions from the toolbar button and reloads', async () => {
    renderWithProviders(<GpsDevicesPage />);

    await userEvent.click(screen.getByRole('button', { name: /Tarik Semua Posisi/ }));

    expect(pullAllDevicePositions).toHaveBeenCalled();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
  });
});
