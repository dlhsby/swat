import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import AlertHistoryPage from '../page';

vi.mock('@/hooks/use-monitoring-range', () => ({
  useMonitoringRange: () => ({
    range: { dateFrom: '2026-06-25', dateTo: '2026-06-25' },
    setRange: vi.fn(),
    today: '2026-06-25',
  }),
}));

vi.mock('@/hooks/use-resource-list', () => ({
  useResourceList: () => ({
    rows: [{ id: 'v1', plateNumber: 'L 1234 AB', modelBrand: 'Isuzu Elf' }],
    loading: false,
    error: false,
    reload: vi.fn(),
  }),
}));

const ackMutate = vi.fn();
const ALERT = {
  id: 'a1',
  vehicleId: 'v1',
  vehiclePlate: 'L 1234 AB',
  tripId: null,
  alertType: 'off_corridor',
  severity: 'WARNING',
  latitude: -7.25,
  longitude: 112.75,
  distanceM: 240,
  pingCount: 3,
  isAcknowledged: false,
  acknowledgedAt: null,
  resolvedAt: null,
  notes: null,
  createdAt: '2026-06-25T08:00:00.000Z',
};

vi.mock('@/hooks/use-tracking', () => ({
  useAlertHistory: () => ({
    data: { data: [ALERT], meta: { total: 1, page: 1, limit: 20 } },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useAcknowledgeAlert: () => ({
    mutate: ackMutate,
    isPending: false,
    variables: undefined,
  }),
}));

describe('AlertHistoryPage', () => {
  it('renders the alert row with its type label and status', () => {
    renderWithProviders(<AlertHistoryPage />);
    expect(screen.getAllByText('L 1234 AB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Keluar koridor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Terbuka').length).toBeGreaterThan(0);
  });

  it('acknowledges an open alert from the row action', async () => {
    renderWithProviders(<AlertHistoryPage />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tandai' })[0]!);
    expect(ackMutate).toHaveBeenCalledWith({ id: 'a1' });
  });
});
