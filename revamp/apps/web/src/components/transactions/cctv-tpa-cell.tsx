'use client';

import { ScreenShare } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

export interface CctvTpaCellProps {
  /** Capture reference stored on the TPA inbound log (URL or path); null = none. */
  readonly reference: string | null;
}

/**
 * Disposal recap "CCTV TPA" cell. Mirrors the legacy screen icon that opened the
 * weighbridge capture in a lightbox: a clickable trigger that shows the image in
 * a modal. The reference is an arbitrary capture URL/path (not a managed Photo),
 * so we render it directly and fall back to the raw reference if it can't load.
 */
export function CctvTpaCell({ reference }: CctvTpaCellProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!reference) {
    return <span className="text-neutral-400">—</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-primary-700 hover:underline dark:text-primary-400"
        title="Lihat bukti capture CCTV TPA"
      >
        <ScreenShare className="h-4 w-4" aria-hidden />
        Lihat
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Capture CCTV TPA</DialogTitle>
            <DialogDescription className="break-all">{reference}</DialogDescription>
          </DialogHeader>

          {failed ? (
            <p className="text-body-sm text-neutral-500">
              Gambar tidak dapat dimuat. Referensi tersimpan:{' '}
              <span className="break-all font-mono text-neutral-700">{reference}</span>
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external capture URL, not a managed/optimizable asset
            <img
              src={reference}
              alt="Capture CCTV TPA"
              className="mx-auto max-h-[480px] w-auto rounded-base border border-neutral-200"
              onError={() => setFailed(true)}
            />
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
