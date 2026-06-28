import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import { TripTemplateCorridorSheet } from '../trip-template-corridor-sheet';

vi.mock('@/lib/google-maps', () => ({
  isMapsConfigured: true,
  MAPS_API_KEY: 'test-key',
  SURABAYA: { lat: -7.2575, lng: 112.7521 },
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  useMap: () => ({ addListener: () => ({ remove: () => undefined }) }),
  useMapsLibrary: () => undefined,
}));

const hooks = vi.hoisted(() => ({
  useRouteCorridors: vi.fn(),
  create: { mutate: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/use-corridors', () => ({
  useRouteCorridors: hooks.useRouteCorridors,
  useCreateCorridor: () => hooks.create,
}));

const updateTripTemplate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/scheduling-api', () => ({ updateTripTemplate }));

const LINE = {
  type: 'LineString' as const,
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ] as [number, number][],
};
const DEFAULT_C = {
  id: 'c1',
  routeId: 'r1',
  name: 'Jalur Utama',
  isDefault: true,
  pathGeojson: LINE,
  waypoints: null,
  toleranceMeters: 150,
  lengthMeters: 1200,
  source: 'directions',
  createdAt: '',
  updatedAt: '',
};
const ALT_C = {
  ...DEFAULT_C,
  id: 'c2',
  name: 'Alternatif Tol',
  isDefault: false,
  lengthMeters: 1500,
};

const TEMPLATE = {
  id: 't1',
  scheduleTemplateId: 's1',
  routeId: 'r1',
  routeCategory: 'PICKUP',
  routeLabel: 'Pool A → TPS 1',
  originSiteId: 'o1',
  originSiteName: 'Pool A',
  destinationSiteId: 'd1',
  destinationSiteName: 'TPS 1',
  corridorId: null,
  corridorName: null,
  targetTime: '06:00',
  fuelRequestedLiters: null,
  createdAt: '',
  updatedAt: '',
};

describe('TripTemplateCorridorSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useRouteCorridors.mockReturnValue({ data: [DEFAULT_C, ALT_C], isLoading: false });
    updateTripTemplate.mockResolvedValue({ ...TEMPLATE });
  });

  it("lists the route's corridors with the default badged", () => {
    renderWithProviders(
      <TripTemplateCorridorSheet template={TEMPLATE} scheduleId="s1" onClose={() => undefined} />,
    );
    expect(screen.getByText('Pilih koridor')).toBeInTheDocument();
    expect(screen.getByText('Pool A → TPS 1')).toBeInTheDocument();
    expect(screen.getByText('Jalur Utama')).toBeInTheDocument();
    expect(screen.getByText('Utama')).toBeInTheDocument();
    expect(screen.getByText('Alternatif Tol')).toBeInTheDocument();
  });

  it('applies an alternate corridor by its id', async () => {
    const onMutated = vi.fn();
    renderWithProviders(
      <TripTemplateCorridorSheet
        template={TEMPLATE}
        scheduleId="s1"
        onClose={() => undefined}
        onMutated={onMutated}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Alternatif Tol/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(updateTripTemplate).toHaveBeenCalledWith('s1', 't1', { corridorId: 'c2' }),
    );
    expect(onMutated).toHaveBeenCalled();
  });

  it('clears the explicit corridor when the default is picked', async () => {
    renderWithProviders(
      <TripTemplateCorridorSheet
        template={{ ...TEMPLATE, corridorId: 'c2', corridorName: 'Alternatif Tol' }}
        scheduleId="s1"
        onClose={() => undefined}
      />,
    );
    // Switch the selection back to the default, then save.
    await userEvent.click(screen.getByRole('button', { name: /Jalur Utama/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(updateTripTemplate).toHaveBeenCalledWith('s1', 't1', { corridorId: '' }),
    );
  });

  it('renders nothing when no template is selected', () => {
    renderWithProviders(
      <TripTemplateCorridorSheet template={null} scheduleId="s1" onClose={() => undefined} />,
    );
    expect(screen.queryByText('Pilih koridor')).not.toBeInTheDocument();
  });
});
