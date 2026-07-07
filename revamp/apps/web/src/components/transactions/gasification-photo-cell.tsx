'use client';

import { Camera } from 'lucide-react';
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

export interface GasificationPhotoCellProps {
  /** Presigned URL of the PTSI gasification capture; null = no match/photo. */
  readonly photoUrl: string | null;
  /** WIB entry time (ISO) captured by PTSI, shown as context in the dialog. */
  readonly enteredAt?: string | null;
  /** PTSI tally operator, shown as context in the dialog. */
  readonly userTally?: string | null;
}

/**
 * Disposal recap "Foto Gasifikasi" cell — mirrors {@link CctvTpaCell}. Opens the PTSI
 * gasification-gate capture (stored in MinIO, served via a presigned URL) in a
 * lightbox. Falls back to a plain notice if the image can't load.
 */
export function GasificationPhotoCell({
  photoUrl,
  enteredAt,
  userTally,
}: GasificationPhotoCellProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!photoUrl) {
    return <span className="text-neutral-400">—</span>;
  }

  const enteredLabel = enteredAt ? new Date(enteredAt).toLocaleString('id-ID') : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-primary-700 hover:underline dark:text-primary-400"
        title="Lihat foto armada masuk gasifikasi"
      >
        <Camera className="h-4 w-4" aria-hidden />
        Lihat
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Foto Armada Masuk Gasifikasi</DialogTitle>
            <DialogDescription>
              {enteredLabel ? `Masuk: ${enteredLabel}` : 'Sumber: PT Surveyor Indonesia'}
              {userTally ? ` · Petugas tally: ${userTally}` : ''}
            </DialogDescription>
          </DialogHeader>

          {failed ? (
            <p className="text-body-sm text-neutral-500">Foto tidak dapat dimuat.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- presigned MinIO URL, not an optimizable static asset
            <img
              src={photoUrl}
              alt="Foto armada masuk gasifikasi"
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
