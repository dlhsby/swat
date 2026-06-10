import { type ColumnDef } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../button';
import { DataTable } from '../data-table';

interface Row {
  plate: string;
  odometer: number;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'plate', header: 'Nomor Polisi', meta: { label: 'Nomor Polisi' } },
  { accessorKey: 'odometer', header: 'Odometer', meta: { label: 'Odometer' } },
];

const data: Row[] = [
  { plate: 'L 1234 AB', odometer: 1000 },
  { plate: 'L 5678 CD', odometer: 2000 },
  { plate: 'L 9999 ZZ', odometer: 3000 },
];

function desktop(): HTMLElement {
  // The md+ table lives in the first .hidden.md\:block wrapper.
  return document.querySelector('.md\\:block') as HTMLElement;
}

describe('DataTable', () => {
  it('renders rows in the desktop table', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(within(desktop()).getByText('L 1234 AB')).toBeInTheDocument();
    expect(screen.getByText('Menampilkan 1–3 dari 3')).toBeInTheDocument();
  });

  it('shows 10 skeleton rows while loading', () => {
    render(<DataTable columns={columns} data={[]} loading />);
    const skeletons = desktop().querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });

  it('shows the error state with a working retry', async () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} data={[]} error onRetry={onRetry} />);
    expect(within(desktop()).getByText('Gagal memuat data')).toBeInTheDocument();
    await userEvent.click(within(desktop()).getByRole('button', { name: 'Coba Lagi' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the empty state with an action when there is no data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="Belum ada kendaraan"
        emptyAction={<Button size="sm">Buat Baru</Button>}
      />,
    );
    expect(within(desktop()).getByText('Belum ada kendaraan')).toBeInTheDocument();
    expect(within(desktop()).getByRole('button', { name: 'Buat Baru' })).toBeInTheDocument();
  });

  it('filters via search (debounced) and shows the no-results state', async () => {
    render(<DataTable columns={columns} data={data} searchPlaceholder="Cari…" />);
    await userEvent.type(screen.getByLabelText('Cari'), 'TIDAKADA');
    expect(await within(desktop()).findByText('Tidak ada hasil pencarian')).toBeInTheDocument();
  });

  it('sorts when a sortable header is clicked', async () => {
    render(<DataTable columns={columns} data={data} enableColumnToggle={false} />);
    const header = within(desktop()).getByRole('button', { name: /Nomor Polisi/ });
    await userEvent.click(header);
    const th = within(desktop()).getAllByRole('columnheader')[0];
    expect(th).toHaveAttribute('aria-sort', 'ascending');
  });

  it('toggles column visibility from the column menu', async () => {
    render(<DataTable columns={columns} data={data} />);
    await userEvent.click(screen.getByRole('button', { name: /Kolom/ }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Odometer' }));
    // Header label "Odometer" should no longer be rendered in the table head.
    expect(
      within(desktop()).queryByRole('columnheader', { name: /Odometer/ }),
    ).not.toBeInTheDocument();
  });

  it('contains-filters a number column, badges the count, and clears all filters', async () => {
    const numColumns: ColumnDef<Row>[] = [
      { accessorKey: 'plate', header: 'Nomor Polisi', meta: { label: 'Nomor Polisi' } },
      {
        accessorKey: 'odometer',
        header: 'Odometer',
        meta: { label: 'Odometer', filterVariant: 'number' },
      },
    ];
    render(<DataTable columns={numColumns} data={data} />);
    // Open the per-column filter row, then type a plain substring into the
    // numeric column — the text "contains" filter must work on numbers.
    await userEvent.click(screen.getByRole('button', { name: /Filter/ }));
    await userEvent.type(screen.getByLabelText('Filter Odometer'), '2000');

    expect(within(desktop()).queryByText('L 1234 AB')).not.toBeInTheDocument();
    expect(within(desktop()).getByText('L 5678 CD')).toBeInTheDocument();
    // The Filter button surfaces a "1 active" count badge.
    expect(screen.getByLabelText('1 filter aktif')).toHaveTextContent('1');

    // "Hapus Filter" clears every column filter at once.
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Filter' }));
    expect(within(desktop()).getByText('L 1234 AB')).toBeInTheDocument();
    expect(screen.queryByLabelText('1 filter aktif')).not.toBeInTheDocument();
  });
});
