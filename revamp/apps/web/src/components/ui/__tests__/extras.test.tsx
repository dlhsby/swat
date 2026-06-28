import { type ColumnDef } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { Breadcrumb, BreadcrumbSeparator } from '../breadcrumb';
import { Command, CommandGroup, CommandItem, CommandList } from '../command';
import { DataTable } from '../data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../dialog';

describe('Avatar image', () => {
  it('mounts within an Avatar with a fallback', () => {
    render(
      <Avatar>
        <AvatarImage src="/x.png" alt="foto" />
        <AvatarFallback>WT</AvatarFallback>
      </Avatar>,
    );
    // Radix shows the fallback until the image loads (no load event in jsdom).
    expect(screen.getByText('WT')).toBeInTheDocument();
  });
});

describe('Breadcrumb extras', () => {
  it('exposes a standalone separator and a single current item', () => {
    render(<BreadcrumbSeparator />);
    render(<Breadcrumb items={[{ label: 'Beranda' }]} />);
    expect(screen.getByText('Beranda')).toHaveAttribute('aria-current', 'page');
  });
});

describe('Command group', () => {
  it('renders grouped items', async () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Kendaraan">
            <CommandItem value="a">L 1</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    expect(await screen.findByText('L 1')).toBeInTheDocument();
    expect(screen.getByText('Kendaraan')).toBeInTheDocument();
  });
});

describe('Dialog header/footer helpers', () => {
  it('renders the header and footer regions', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Judul</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <button>Simpan</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Judul')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument();
  });
});

describe('DataTable pagination bar', () => {
  const columns: ColumnDef<{ n: number }>[] = [
    { accessorKey: 'n', header: 'N', meta: { label: 'N' } },
  ];
  const data = Array.from({ length: 60 }, (_, i) => ({ n: i + 1 }));

  function desktop(): HTMLElement {
    return document.querySelector('.md\\:block') as HTMLElement;
  }

  it('paginates forward and changes the page size', async () => {
    render(<DataTable columns={columns} data={data} enableColumnToggle={false} />);
    // Default page size is 10.
    expect(screen.getByText('Menampilkan 1–10 dari 60')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    expect(screen.getByText('Menampilkan 11–20 dari 60')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByText('Menampilkan 1–10 dari 60')).toBeInTheDocument();

    // Change rows-per-page to 100 → single page of 60.
    await userEvent.click(
      within(desktop()).queryByRole('combobox') ?? screen.getByRole('combobox'),
    );
    await userEvent.click(await screen.findByRole('option', { name: '100 / hlm' }));
    expect(screen.getByText('Menampilkan 1–60 dari 60')).toBeInTheDocument();
  });
});
