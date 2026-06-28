import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CctvTpaCell } from '../cctv-tpa-cell';

describe('CctvTpaCell', () => {
  it('renders a dash and no trigger when there is no reference', () => {
    render(<CctvTpaCell reference={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lihat/i })).not.toBeInTheDocument();
  });

  it('opens an image modal showing the capture reference', async () => {
    const user = userEvent.setup();
    const ref = 'https://cdn.example/cctv/2026-06-24/L1234XY.jpg';
    render(<CctvTpaCell reference={ref} />);

    await user.click(screen.getByRole('button', { name: /lihat/i }));

    const dialog = await screen.findByRole('dialog');
    const img = screen.getByRole('img', { name: /capture cctv tpa/i });
    expect(img).toHaveAttribute('src', ref);
    // Reference string is surfaced in the dialog description.
    expect(within(dialog).getByText(ref)).toBeInTheDocument();
  });

  it('falls back to the raw reference when the image fails to load', async () => {
    const user = userEvent.setup();
    const ref = './upload_cctv/2020-11-19/L9235AP/3543314_0.bmp';
    render(<CctvTpaCell reference={ref} />);

    await user.click(screen.getByRole('button', { name: /lihat/i }));
    const img = await screen.findByRole('img', { name: /capture cctv tpa/i });
    fireEvent.error(img);

    expect(screen.getByText(/tidak dapat dimuat/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /capture cctv tpa/i })).not.toBeInTheDocument();
  });
});
