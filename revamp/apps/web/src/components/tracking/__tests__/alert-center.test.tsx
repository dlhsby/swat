import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import { AlertCenter } from '../alert-center';

const hooks = vi.hoisted(() => ({
  useAlerts: vi.fn(),
  ack: { mutate: vi.fn(), isPending: false, variables: undefined as { id: string } | undefined },
}));

vi.mock('@/hooks/use-tracking', () => ({
  useAlerts: hooks.useAlerts,
  useAcknowledgeAlert: () => hooks.ack,
}));

function alert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    vehicleId: 'v1',
    vehiclePlate: 'L 1234 AB',
    tripId: 't1',
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
    createdAt: '2026-06-25T10:00:00Z',
    ...overrides,
  };
}

describe('AlertCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useAlerts.mockReturnValue({ alerts: [], isLoading: false, connectionState: 'open' });
  });

  it('shows an empty state with no alerts', () => {
    renderWithProviders(<AlertCenter />);
    expect(screen.getByText('Tidak ada peringatan aktif.')).toBeInTheDocument();
  });

  it('renders an alert with its plate, type, and severity', () => {
    hooks.useAlerts.mockReturnValue({
      alerts: [alert()],
      isLoading: false,
      connectionState: 'open',
    });
    renderWithProviders(<AlertCenter />);
    expect(screen.getByText('L 1234 AB')).toBeInTheDocument();
    expect(screen.getByText(/Keluar koridor/)).toBeInTheDocument();
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });

  it('acknowledges an alert on click', async () => {
    hooks.useAlerts.mockReturnValue({
      alerts: [alert()],
      isLoading: false,
      connectionState: 'open',
    });
    renderWithProviders(<AlertCenter />);
    await userEvent.click(screen.getByRole('button', { name: 'Tandai' }));
    expect(hooks.ack.mutate).toHaveBeenCalledWith({ id: 'a1' });
  });
});
