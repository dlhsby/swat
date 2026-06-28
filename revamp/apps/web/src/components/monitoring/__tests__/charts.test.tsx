import { render } from '@testing-library/react';
import { cloneElement, type ReactElement } from 'react';
import type * as Recharts from 'recharts';
import { describe, expect, it, vi } from 'vitest';

import { FuelGrouped } from '../charts/fuel-grouped';
import { SourceDonut } from '../charts/source-donut';
import { TonnageColumns } from '../charts/tonnage-columns';

// Recharts' ResponsiveContainer measures its parent, which jsdom reports as 0×0,
// so charts never paint. Give the inner chart explicit dimensions instead so the
// SVG renders and we can assert on the drawn marks.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<any> }) =>
      cloneElement(children, { width: 500, height: 300 }),
  };
});

describe('TonnageColumns', () => {
  it('renders one column per day', () => {
    const { container } = render(
      <TonnageColumns
        data={[
          { label: '1 Jun', date: '2026-06-01', ton: 4, deltaTon: null, deltaPct: null },
          { label: '2 Jun', date: '2026-06-02', ton: 6, deltaTon: 2, deltaPct: 50 },
        ]}
      />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
  });
});

describe('FuelGrouped', () => {
  it('renders requested and approved bars per vehicle and flags red ones', () => {
    const { container } = render(
      <FuelGrouped
        data={[
          { plate: 'L 1 AB', requested: 100, approved: 80, flagged: true },
          { plate: 'L 2 CD', requested: 50, approved: 50, flagged: false },
        ]}
      />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    // Two series (requested + approved) × two vehicles = four rectangles.
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(4);
    // The flagged vehicle's approved bar uses the danger colour.
    expect(container.innerHTML).toContain('var(--danger-500)');
  });
});

describe('SourceDonut', () => {
  it('renders a labelled legend with tonnes for each slice', () => {
    const { getByText } = render(
      <SourceDonut
        slices={[
          { name: 'Dinas', ton: 7, color: 'var(--primary-700)' },
          { name: 'Pasar', ton: 3, color: 'var(--primary-500)' },
        ]}
      />,
    );
    expect(getByText('Dinas')).toBeInTheDocument();
    expect(getByText('Pasar')).toBeInTheDocument();
    expect(getByText('7 ton')).toBeInTheDocument();
    expect(getByText('3 ton')).toBeInTheDocument();
  });
});
