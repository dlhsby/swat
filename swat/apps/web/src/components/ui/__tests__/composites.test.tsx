import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '../alert-dialog';
import { DescriptionList } from '../description-list';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Dropzone, DropzoneFile } from '../dropzone';
import { EmptyState } from '../empty-state';
import { Pagination, paginationRange } from '../pagination';
import { Progress } from '../progress';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../sheet';
import { Stepper } from '../stepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

describe('Dialog', () => {
  it('opens on trigger and closes via the ✕', async () => {
    render(
      <Dialog>
        <DialogTrigger>Buka</DialogTrigger>
        <DialogContent>
          <DialogTitle>Judul</DialogTitle>
          <DialogDescription>Deskripsi</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buka' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('renders alertdialog without a close ✕ and confirms', async () => {
    const onConfirm = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Hapus kendaraan?"
          description="Yakin?"
          onConfirm={onConfirm}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tutup' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('Sheet', () => {
  it('opens from the trigger', async () => {
    render(
      <Sheet>
        <SheetTrigger>Detail</SheetTrigger>
        <SheetContent>
          <SheetTitle>Trip Sheet</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Detail' }));
    expect(screen.getByText('Trip Sheet')).toBeInTheDocument();
  });
});

describe('DropdownMenu', () => {
  it('opens and fires an item action', async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Aksi</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Ubah</DropdownMenuItem>
          <DropdownMenuItem destructive>Hapus</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Aksi' }));
    await userEvent.click(await screen.findByText('Ubah'));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('Tabs', () => {
  it('switches panels on tab click', async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Pribadi</TabsTrigger>
          <TabsTrigger value="b">SIM</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Data Pribadi</TabsContent>
        <TabsContent value="b">Data SIM</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Data Pribadi')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'SIM' }));
    expect(screen.getByText('Data SIM')).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('sets aria-valuenow when determinate', () => {
    render(<Progress value={40} aria-label="unggah" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  });

  it('omits aria-valuenow when indeterminate', () => {
    render(<Progress value={null} aria-label="memuat" />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });
});

describe('Stepper', () => {
  it('marks done, active and upcoming steps', () => {
    render(
      <Stepper
        current={1}
        steps={[{ label: 'Pilih Rute' }, { label: 'Catat' }, { label: 'Konfirmasi' }]}
      />,
    );
    // active step exposes aria-current
    const active = screen.getByText('Catat').closest('li');
    expect(active).toHaveAttribute('aria-current', 'step');
    // mobile compact label present
    expect(screen.getByText('Langkah 2 dari 3')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('paginationRange lists all pages below the truncation threshold', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('paginationRange inserts ellipsis for large ranges', () => {
    const range = paginationRange(6, 12, 1);
    expect(range[0]).toBe(1);
    expect(range).toContain('ellipsis');
    expect(range[range.length - 1]).toBe(12);
  });

  it('navigates and disables edges', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('DescriptionList', () => {
  it('renders term→value rows', () => {
    render(
      <DescriptionList
        items={[
          { term: 'Rute', value: 'TPS A → TPA B' },
          { term: 'Berat', value: '4,2 ton', numeric: true },
        ]}
      />,
    );
    expect(screen.getByText('Rute')).toBeInTheDocument();
    expect(screen.getByText('4,2 ton')).toHaveClass('tnum');
  });
});

describe('EmptyState', () => {
  it('renders the illustration, title and action', () => {
    render(<EmptyState title="Belum ada data" action={<button>Buat Baru</button>} />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat Baru' })).toBeInTheDocument();
  });
});

describe('Dropzone', () => {
  it('accepts a valid JPG via the file input', async () => {
    const onFilesAccepted = vi.fn();
    const { container } = render(<Dropzone onFilesAccepted={onFilesAccepted} maxSizeMb={1} />);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const good = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, good);
    expect(onFilesAccepted).toHaveBeenCalledWith([good]);
  });

  it('rejects a wrong type and oversized files on drop (client-side guard)', () => {
    const onFilesAccepted = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <Dropzone onFilesAccepted={onFilesAccepted} onReject={onReject} maxSizeMb={1} />,
    );
    const zone = container.firstChild as HTMLElement;

    const wrong = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.drop(zone, { dataTransfer: { files: [wrong] } });
    expect(onReject).toHaveBeenCalledWith(expect.stringContaining('Tipe berkas'));

    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    fireEvent.drop(zone, { dataTransfer: { files: [big] } });
    expect(onReject).toHaveBeenCalledWith(expect.stringContaining('Ukuran berkas'));
    expect(onFilesAccepted).not.toHaveBeenCalled();
  });

  it('DropzoneFile shows progress, error retry and remove', async () => {
    const onRemove = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = render(<DropzoneFile name="foto.jpg" progress={40} onRemove={onRemove} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    rerender(<DropzoneFile name="foto.jpg" error onRetry={onRetry} onRemove={onRemove} />);
    expect(screen.getByText('Gagal mengunggah')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Hapus berkas' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
