import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Calendar } from '../calendar';
import { DatePicker } from '../date-picker';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../sheet';
import { notify, Toaster } from '../toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';

describe('Tooltip', () => {
  it('reveals content on focus', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>info</TooltipTrigger>
          <TooltipContent>Bantuan</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await userEvent.hover(screen.getByText('info'));
    expect(await screen.findAllByText('Bantuan')).not.toHaveLength(0);
  });
});

describe('Select', () => {
  it('opens and selects an item', async () => {
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="tipe">
          <SelectValue placeholder="Pilih…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Tipe Lokasi</SelectLabel>
            <SelectItem value="TPS">TPS</SelectItem>
            <SelectItem value="TPA">TPA</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByLabelText('tipe'));
    await userEvent.click(await screen.findByRole('option', { name: 'TPA' }));
    expect(onValueChange).toHaveBeenCalledWith('TPA');
  });
});

describe('Sheet sections', () => {
  it('renders header/body/footer and closes', async () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Trip Sheet</SheetTitle>
            <SheetDescription>Rincian rit</SheetDescription>
          </SheetHeader>
          <SheetBody>Isi</SheetBody>
          <SheetFooter>
            <button>Simpan</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByText('Trip Sheet')).toBeInTheDocument();
    expect(screen.getByText('Rincian rit')).toBeInTheDocument();
    expect(screen.getByText('Isi')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByText('Trip Sheet')).not.toBeInTheDocument();
  });
});

describe('Calendar / DatePicker', () => {
  it('selects a day and emits an ISO date', async () => {
    const onValueChange = vi.fn();
    render(<DatePicker value="2026-03-15" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByText('15/03/2026'));
    // Calendar opens on the selected month (March); pick the 20th.
    const grid = await screen.findByRole('grid');
    await userEvent.click(within(grid).getByText('20'));
    expect(onValueChange).toHaveBeenCalledWith('2026-03-20');
  });

  it('renders a standalone calendar with Indonesian caption', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 2, 1)} />);
    // Indonesian month name for March is "Maret".
    expect(screen.getByText(/Maret 2026/i)).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('renders the toaster region and enqueues each variant', async () => {
    function Harness() {
      const [done, setDone] = useState(false);
      return (
        <>
          <Toaster />
          <button
            onClick={() => {
              notify.success('Berhasil', 'tersimpan');
              notify.error('Gagal');
              notify.warning('Peringatan');
              notify.info('Informasi');
              setDone(true);
            }}
          >
            fire
          </button>
          {done ? <span>fired</span> : null}
        </>
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('fired')).toBeInTheDocument();
    expect(await screen.findByText('Berhasil')).toBeInTheDocument();
  });
});
