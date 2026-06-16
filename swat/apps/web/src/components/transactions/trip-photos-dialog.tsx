'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  notify,
} from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/lib/api-error';
import { type TripPhotoDto, listTripPhotos, uploadTripPhoto } from '@/lib/transactions-api';
import { type TripDto } from '@/lib/types/transactions';

export interface TripPhotosDialogProps {
  /** The trip whose photos are shown; null closes the dialog. */
  trip: TripDto | null;
  onOpenChange: (open: boolean) => void;
}

/** View and attach a trip's documentation photos (legacy dokumentasitrayek). */
export function TripPhotosDialog({ trip, onOpenChange }: TripPhotosDialogProps): JSX.Element {
  const { can } = usePermissions();
  const canUpload = can('trip:update');
  const [photos, setPhotos] = useState<TripPhotoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!trip) {
      return;
    }
    setLoading(true);
    listTripPhotos(trip.id)
      .then(setPhotos)
      .catch(() => notify.error('Gagal memuat foto.'))
      .finally(() => setLoading(false));
  }, [trip]);

  const onPick = async (file: File | undefined): Promise<void> => {
    if (!trip || !file) {
      return;
    }
    setUploading(true);
    try {
      const photo = await uploadTripPhoto(trip.id, file);
      setPhotos((prev) => [...prev, photo]);
      notify.success('Foto berhasil diunggah.');
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={trip !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Foto Dokumentasi</DialogTitle>
          <DialogDescription>{trip?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-body-sm text-neutral-500">Memuat…</p>
          ) : photos.length === 0 ? (
            <p className="text-body-sm text-neutral-500">Belum ada foto.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-base border border-neutral-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Dokumentasi trip"
                    className="aspect-square h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          {canUpload ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPick(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                className="w-full"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                + Unggah foto
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
