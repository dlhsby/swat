'use client';

import { useEffect, useState } from 'react';

import { type SelectOption } from '@/components/crud/fields';
import { InspectionStatusControl } from '@/components/operations/inspection-status-control';
import {
  Badge,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import {
  type InspectionDto,
  type InspectionItemStatusValue,
  type InspectionResultValue,
  inspectionsApi,
} from '@/lib/operations-api';

/** The default checklist (mirrors the backend INSPECTION_CHECKLIST template). */
const CHECKLIST: readonly string[] = [
  'Rem',
  'Lampu',
  'Ban',
  'Klakson',
  'Kaca Spion',
  'Wiper',
  'Oli Mesin',
  'Air Radiator',
  'Aki',
  'Sabuk Pengaman',
  'Sistem Hidrolik',
  'Kebersihan',
];

interface ItemState {
  label: string;
  status: InspectionItemStatusValue;
}

const RESULT_LABEL: Record<
  InspectionResultValue,
  { label: string; variant: 'green' | 'amber' | 'red' }
> = {
  PASS: { label: 'Lolos', variant: 'green' },
  ATTENTION: { label: 'Perlu Perhatian', variant: 'amber' },
  FAIL: { label: 'Tidak Lolos', variant: 'red' },
};

function deriveResult(items: ItemState[]): InspectionResultValue {
  if (items.some((i) => i.status === 'FAIL')) return 'FAIL';
  if (items.some((i) => i.status === 'ATTENTION')) return 'ATTENTION';
  return 'PASS';
}

function defaultItems(): ItemState[] {
  return CHECKLIST.map((label) => ({ label, status: 'OK' }));
}

export interface InspectionDialogProps {
  open: boolean;
  /** The inspection being edited, or null when creating. */
  editing: InspectionDto | null;
  vehicleOptions: SelectOption[];
  /** When set, a new inspection is pre-locked to this vehicle (select disabled). */
  lockedVehicleId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Create / edit a vehicle inspection with the checklist + live result. */
export function InspectionDialog({
  open,
  editing,
  vehicleOptions,
  lockedVehicleId,
  onOpenChange,
  onSaved,
}: InspectionDialogProps): JSX.Element {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemState[]>(defaultItems());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (editing) {
      setVehicleId(editing.vehicleId);
      setDate(editing.date);
      setNotes(editing.notes ?? '');
      setItems(editing.items.map((i) => ({ label: i.label, status: i.status })));
    } else {
      setVehicleId(lockedVehicleId ?? null);
      setDate('');
      setNotes('');
      setItems(defaultItems());
    }
  }, [open, editing, lockedVehicleId]);

  const result = deriveResult(items);
  const passed = items.filter((i) => i.status === 'OK').length;
  const canSubmit = vehicleId !== null && date !== '';

  const setItemStatus = (index: number, status: InspectionItemStatusValue): void => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, status } : it)));
  };

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit || vehicleId === null) {
      return;
    }
    setSaving(true);
    // The vehicle is immutable on edit (the select is disabled), and the update
    // DTO rejects it — so vehicleId is sent only when creating.
    const payload = {
      date,
      ...(notes ? { notes } : {}),
      items: items.map((i) => ({ label: i.label, status: i.status })),
    };
    try {
      if (editing) {
        await inspectionsApi.update(editing.id, payload);
        notify.success('Pemeriksaan diperbarui.');
      } else {
        await inspectionsApi.create({ vehicleId, ...payload });
        notify.success('Pemeriksaan dicatat.');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan.');
    } finally {
      setSaving(false);
    }
  };

  const resultMeta = RESULT_LABEL[result];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Ubah Pemeriksaan' : 'Periksa Kendaraan'}</DialogTitle>
          <DialogDescription className="sr-only">Checklist pemeriksaan kendaraan</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-0.5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Kendaraan</Label>
              <Select
                value={vehicleId ?? undefined}
                onValueChange={(v) => setVehicleId(v)}
                disabled={editing !== null || lockedVehicleId !== undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleOptions.map((o) => (
                    <SelectItem key={String(o.value)} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Tanggal</Label>
              <DatePicker value={date || undefined} onValueChange={(v) => setDate(v ?? '')} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-base border border-neutral-200 bg-neutral-50 p-3">
            <span className="text-label text-neutral-500">
              {passed}/{items.length} lolos
            </span>
            <Badge variant={resultMeta.variant} dot>
              {resultMeta.label}
            </Badge>
          </div>

          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-base border border-neutral-200 px-3 py-2"
              >
                <span className="text-body-sm text-neutral-900">{item.label}</span>
                <InspectionStatusControl
                  value={item.status}
                  ariaLabel={item.label}
                  onChange={(status) => setItemStatus(i, status)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} loading={saving} disabled={!canSubmit}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
