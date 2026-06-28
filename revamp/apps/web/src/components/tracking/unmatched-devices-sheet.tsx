'use client';

import { useState } from 'react';

import {
  Button,
  Combobox,
  type ComboboxOption,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
  notify,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatTime } from '@/lib/format';
import { listUnmatchedPings, mapUnmatchedPing } from '@/lib/gps-device-api';

/**
 * The unmatched-IMEI queue (Phase 7): IMEIs seen on the GPS.id webhook with no
 * registered device. Each can be mapped to a vehicle in one click — that creates
 * the hardware device and clears the queued pings.
 */
export function UnmatchedDevicesSheet({
  open,
  onOpenChange,
  vehicleOptions,
  onMapped,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleOptions: ComboboxOption[];
  onMapped: () => void;
}): JSX.Element {
  const { rows, loading, reload } = useResourceList(listUnmatchedPings);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [savingImei, setSavingImei] = useState<string | null>(null);

  const map = async (imei: string): Promise<void> => {
    const vehicleId = pick[imei];
    if (!vehicleId) {
      notify.error('Pilih kendaraan terlebih dahulu.');
      return;
    }
    setSavingImei(imei);
    try {
      await mapUnmatchedPing({ imei, vehicleId });
      notify.success('IMEI dipetakan ke kendaraan.');
      await reload();
      onMapped();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memetakan IMEI.');
    } finally {
      setSavingImei(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>IMEI tak dikenal</SheetTitle>
          <SheetDescription>
            Perangkat yang mengirim posisi tetapi belum terdaftar. Petakan ke kendaraan untuk mulai
            melacaknya.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6 text-neutral-400" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-body-sm text-neutral-500">
              Tidak ada IMEI tak dikenal. 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.imei}
                  className="rounded-base border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-body-sm font-semibold">{row.imei}</span>
                    <span className="text-tiny text-neutral-500">
                      {row.count}× · {formatDateDisplay(row.lastReceivedAt)}{' '}
                      {formatTime(row.lastReceivedAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Combobox
                      options={vehicleOptions}
                      value={pick[row.imei] ?? ''}
                      onValueChange={(v) => setPick((p) => ({ ...p, [row.imei]: v }))}
                      placeholder="Pilih kendaraan"
                      searchPlaceholder="Cari nomor polisi…"
                      limit={50}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => void map(row.imei)}
                      disabled={savingImei === row.imei}
                    >
                      Petakan
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
