'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { type GpsSyncResult } from '@/lib/gps-device-api';

/** A single labelled count in the summary strip. */
function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' }): JSX.Element {
  return (
    <div className="rounded-base border border-neutral-200 px-3 py-2 text-center">
      <div
        className={
          tone === 'warn' && value > 0
            ? 'text-h3 tabular-nums text-amber-600'
            : 'text-h3 tabular-nums text-neutral-900'
        }
      >
        {value}
      </div>
      <div className="text-tiny text-neutral-500">{label}</div>
    </div>
  );
}

/** A scrollable list of `imei — plate` rows (used for each result section). */
function DeviceList({
  rows,
}: {
  rows: ReadonlyArray<{ imei: string; plate: string; inactiveDueToConflict?: boolean }>;
}): JSX.Element {
  return (
    <ul className="max-h-56 divide-y divide-neutral-100 overflow-y-auto rounded-base border border-neutral-200">
      {rows.map((r) => (
        <li key={r.imei} className="flex items-center justify-between gap-3 px-3 py-1.5 text-body-sm">
          <span className="font-mono text-neutral-500">{r.imei}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono font-semibold text-neutral-800">{r.plate}</span>
            {r.inactiveDueToConflict ? (
              <span className="rounded-[5px] bg-amber-100 px-1.5 py-0.5 text-tiny font-semibold text-amber-700">
                nonaktif
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A titled section, rendered only when it has rows. */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-label font-semibold text-neutral-700">{title}</p>
      {hint ? <p className="text-tiny text-neutral-500">{hint}</p> : null}
      {children}
    </div>
  );
}

/**
 * Sync results modal (Phase 7 / B4). Shows the outcome of a GPS.id vehicle-roster
 * sync: what was created/remapped/unchanged, and — most usefully — the vendor
 * vehicles whose plate matched no SWAT vehicle so the operator can fix the plate
 * or register the vehicle.
 */
export function GpsSyncResultDialog({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: GpsSyncResult | null;
}): JSX.Element | null {
  if (!result) {
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,560px)]">
        <DialogHeader>
          <DialogTitle>Hasil sinkronisasi GPS.id</DialogTitle>
          <DialogDescription>
            Perangkat dicocokkan dengan kendaraan berdasarkan nomor polisi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Dibuat" value={result.createdCount} />
          <Stat label="Dipetakan ulang" value={result.remappedCount} />
          <Stat label="Tetap" value={result.unchangedCount} />
          <Stat label="Nonaktif (konflik)" value={result.conflictCount} tone="warn" />
          <Stat label="Tanpa plat" value={result.skippedNoPlateCount} tone="warn" />
          <Stat label="Tak cocok" value={result.unmatchedVehicles.length} tone="warn" />
        </div>

        <div className="space-y-4">
          {result.created.length > 0 ? (
            <Section title={`Perangkat baru (${result.created.length})`}>
              <DeviceList rows={result.created} />
            </Section>
          ) : null}

          {result.remapped.length > 0 ? (
            <Section title={`Dipetakan ulang (${result.remapped.length})`}>
              <DeviceList rows={result.remapped} />
            </Section>
          ) : null}

          {result.unmatchedVehicles.length > 0 ? (
            <Section
              title={`Tak cocok dengan data SWAT (${result.unmatchedVehicles.length})`}
              hint="Nomor polisi ini ada di GPS.id tetapi tidak ditemukan pada master kendaraan. Periksa penulisan plat atau daftarkan kendaraannya."
            >
              <DeviceList rows={result.unmatchedVehicles} />
            </Section>
          ) : null}

          {result.createdCount === 0 &&
          result.remappedCount === 0 &&
          result.unmatchedVehicles.length === 0 ? (
            <p className="text-body-sm text-neutral-500">
              Semua perangkat sudah sesuai — tidak ada perubahan.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
