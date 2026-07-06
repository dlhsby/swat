import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type * as GpsDeviceApi from '@/lib/gps-device-api';
import { type VehicleDto } from '@/lib/master-api';
import { renderWithProviders } from '@/test-utils/render';

import { VehicleDevicesSheet } from '../vehicle-devices-sheet';

// ProtectedAction → usePermissions → useAuth → @/providers/auth-provider, which
// pulls in @/i18n/navigation (next-intl's createNavigation) — that fails to
// resolve under vitest's ESM setup. Mock the permission check directly.
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: ['*:*'],
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  }),
}));

const DEVICE_A = {
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
  lastLat: null,
  lastLng: null,
  lastSpeedKmh: null,
  lastHeading: null,
  createdAt: '2026-07-04T05:06:45.164Z',
  updatedAt: '2026-07-05T13:26:40.071Z',
};
const DEVICE_B = { ...DEVICE_A, id: 'd2', imei: '350000000000004', active: false };

const { listVehicleDevices, pullDevicePosition } = vi.hoisted(() => ({
  listVehicleDevices: vi.fn().mockResolvedValue([]),
  pullDevicePosition: vi.fn().mockResolvedValue({
    enqueued: 1000,
    latest: {
      latitude: -7.27406,
      longitude: 112.63714,
      speedKmh: 0,
      recordedAt: '2026-07-05T05:16:23.000Z',
    },
  }),
}));

vi.mock('@/lib/gps-device-api', async (importOriginal) => {
  const actual = await importOriginal<typeof GpsDeviceApi>();
  return { ...actual, listVehicleDevices, pullDevicePosition };
});

const VEHICLE = { id: 'v1', plateNumber: 'L 1234 AB' } as VehicleDto;

describe('VehicleDevicesSheet', () => {
  it('shows a "Tarik Posisi" button per device (a vehicle can have several)', async () => {
    listVehicleDevices.mockResolvedValue([DEVICE_A, DEVICE_B]);
    renderWithProviders(<VehicleDevicesSheet vehicle={VEHICLE} onOpenChange={vi.fn()} />);

    const buttons = await screen.findAllByRole('button', { name: 'Tarik posisi terkini' });
    expect(buttons).toHaveLength(2);
  });

  it('pulls the specific device, reloads, and notifies the outer grid', async () => {
    listVehicleDevices.mockResolvedValue([DEVICE_A, DEVICE_B]);
    const onChanged = vi.fn();
    renderWithProviders(
      <VehicleDevicesSheet vehicle={VEHICLE} onOpenChange={vi.fn()} onChanged={onChanged} />,
    );

    const buttons = await screen.findAllByRole('button', { name: 'Tarik posisi terkini' });
    await userEvent.click(buttons[0]!);

    expect(pullDevicePosition).toHaveBeenCalledWith('d1');
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(listVehicleDevices).toHaveBeenCalledTimes(2); // initial load + post-pull reload
  });
});
