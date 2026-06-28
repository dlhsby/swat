import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MapPicker, round6 } from '../map-picker';

const config = vi.hoisted(() => ({ isMapsConfigured: true }));

vi.mock('@/lib/google-maps', () => ({
  get isMapsConfigured() {
    return config.isMapsConfigured;
  },
  MAPS_API_KEY: 'test-key',
  SURABAYA: { lat: -7.2575, lng: 112.7521 },
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  useMap: () => null,
  useMapsLibrary: () => undefined,
}));

describe('round6', () => {
  it('rounds to 6 decimal places', () => {
    expect(round6(-7.25751234)).toBe(-7.257512);
    expect(round6(112.7521)).toBe(112.7521);
  });
});

describe('MapPicker', () => {
  it('shows a manual-entry placeholder when the Maps key is unconfigured', () => {
    config.isMapsConfigured = false;
    render(<MapPicker value={null} onChange={() => undefined} />);
    expect(screen.getByText(/Peta belum dikonfigurasi/)).toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });

  it('renders the map, address search and my-location control when configured', () => {
    config.isMapsConfigured = true;
    render(<MapPicker value={{ lat: -7.25, lng: 112.75 }} onChange={() => undefined} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByLabelText('Cari alamat')).toBeInTheDocument();
    expect(screen.getByLabelText('Gunakan lokasi saya')).toBeInTheDocument();
  });
});
