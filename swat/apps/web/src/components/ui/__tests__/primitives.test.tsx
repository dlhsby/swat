import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Alert } from '../alert';
import { Avatar, AvatarFallback } from '../avatar';
import { Badge, StatusPill } from '../badge';
import { Breadcrumb } from '../breadcrumb';
import { Button } from '../button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../card';
import { Input } from '../input';
import { Label } from '../label';
import { Skeleton } from '../skeleton';
import { Spinner } from '../spinner';
import { Textarea } from '../textarea';

describe('Button', () => {
  it('renders the default primary button and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Simpan</Button>);
    const btn = screen.getByRole('button', { name: 'Simpan' });
    expect(btn).toHaveClass('bg-primary-700');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies each variant and size class', () => {
    const { rerender } = render(<Button variant="destructive">x</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger-600');
    rerender(
      <Button variant="outline" size="lg">
        x
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('border-neutral-300', 'h-11');
  });

  it('shows a spinner and is non-interactive while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Simpan
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as a child element when asChild', () => {
    render(
      <Button asChild>
        <a href="/x">Tautan</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Tautan' });
    expect(link).toHaveClass('bg-primary-700');
  });
});

describe('Badge & StatusPill', () => {
  it('renders solid/outline/count appearances', () => {
    const { rerender } = render(
      <Badge variant="green" dot>
        OK
      </Badge>,
    );
    expect(screen.getByText('OK')).toHaveClass('bg-success-100');
    rerender(<Badge appearance="count">3/5</Badge>);
    expect(screen.getByText('3/5')).toHaveClass('bg-neutral-100');
  });

  it('resolves a domain enum to its Indonesian label', () => {
    render(<StatusPill domain="trip" value="VERIFIED" />);
    expect(screen.getByText('Terverifikasi')).toHaveClass('bg-success-100');
  });

  it('falls back to a slate pill with the raw value when unknown', () => {
    render(<StatusPill domain="trip" value="WAT" />);
    expect(screen.getByText('WAT')).toHaveClass('bg-neutral-100');
  });
});

describe('Input & Textarea', () => {
  it('marks invalid via aria-invalid and danger border', () => {
    render(<Input error aria-label="plate" />);
    const input = screen.getByLabelText('plate');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('border-danger-500');
  });

  it('renders leading and trailing adornments', () => {
    render(<Input aria-label="dist" trailing={<span>km</span>} leading={<span>@</span>} />);
    expect(screen.getByText('km')).toBeInTheDocument();
    expect(screen.getByText('@')).toBeInTheDocument();
  });

  it('textarea sets aria-invalid on error', () => {
    render(<Textarea error aria-label="note" />);
    expect(screen.getByLabelText('note')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Label', () => {
  it('appends a required asterisk', () => {
    render(<Label required>Nama</Label>);
    expect(screen.getByText('Nama').textContent).toContain('*');
  });
});

describe('Card', () => {
  it('composes header/title/content/footer', () => {
    render(
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Judul</CardTitle>
        </CardHeader>
        <CardContent>Isi</CardContent>
        <CardFooter>Kaki</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Judul')).toBeInTheDocument();
    expect(screen.getByText('Isi')).toBeInTheDocument();
    expect(screen.getByText('Kaki')).toBeInTheDocument();
  });
});

describe('Alert', () => {
  it('uses role=alert for danger/warning and status for info/success', () => {
    const { rerender } = render(<Alert variant="danger" title="Gagal" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<Alert variant="success" title="Berhasil" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a dismiss button that calls onClose', async () => {
    const onClose = vi.fn();
    render(
      <Alert variant="info" onClose={onClose}>
        Pesan
      </Alert>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('Avatar', () => {
  it('shows initials in the fallback', () => {
    render(
      <Avatar>
        <AvatarFallback>WT</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('WT')).toBeInTheDocument();
  });
});

describe('Breadcrumb', () => {
  it('links non-final items and marks the last as current', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Master Data', href: '/master' },
          { label: 'Kendaraan', href: '/master/vehicles' },
          { label: 'Ubah' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Master Data' })).toHaveAttribute('href', '/master');
    expect(screen.getByText('Ubah')).toHaveAttribute('aria-current', 'page');
  });
});

describe('Spinner & Skeleton', () => {
  it('spinner is decorative by default, labelled when given aria-label', () => {
    const { rerender, container } = render(<Spinner />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Spinner aria-label="Memuat" />);
    expect(screen.getByLabelText('Memuat')).toBeInTheDocument();
  });

  it('skeleton renders an aria-hidden shimmer bar', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});
