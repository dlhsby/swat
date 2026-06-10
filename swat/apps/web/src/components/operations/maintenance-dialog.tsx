'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type SelectOption } from '@/components/crud/fields';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { formatRupiah } from '@/lib/format';
import {
  type MaintenanceDto,
  type MaintenanceTypeValue,
  maintenanceApi,
} from '@/lib/operations-api';

interface LineItem {
  name: string;
  qty: number | '';
  unitPrice: number | '';
}

const TYPE_OPTIONS: ReadonlyArray<{ value: MaintenanceTypeValue; label: string }> = [
  { value: 'SERVICE', label: 'Servis' },
  { value: 'REPAIR', label: 'Perbaikan' },
];

const num = (v: number | ''): number => (v === '' ? 0 : v);
const lineTotal = (item: LineItem): number => num(item.qty) * num(item.unitPrice);
const emptyItem = (): LineItem => ({ name: '', qty: 1, unitPrice: 0 });

export interface MaintenanceDialogProps {
  open: boolean;
  editing: MaintenanceDto | null;
  /** Read-only view (e.g. an approved record). */
  readOnly?: boolean;
  vehicleOptions: SelectOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Create / edit a maintenance record with a line-item sub-table + live total. */
export function MaintenanceDialog({
  open,
  editing,
  readOnly = false,
  vehicleOptions,
  onOpenChange,
  onSaved,
}: MaintenanceDialogProps): JSX.Element {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [type, setType] = useState<MaintenanceTypeValue>('SERVICE');
  const [date, setDate] = useState('');
  const [odometer, setOdometer] = useState<number | ''>('');
  const [workshop, setWorkshop] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (editing) {
      setVehicleId(editing.vehicleId);
      setType(editing.type);
      setDate(editing.date);
      setOdometer(editing.odometer ?? '');
      setWorkshop(editing.workshop ?? '');
      setDescription(editing.description ?? '');
      setItems(
        editing.items.length > 0
          ? editing.items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice }))
          : [emptyItem()],
      );
    } else {
      setVehicleId(null);
      setType('SERVICE');
      setDate('');
      setOdometer('');
      setWorkshop('');
      setDescription('');
      setItems([emptyItem()]);
    }
  }, [open, editing]);

  const totalCost = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const canSubmit = vehicleId !== null && date !== '';

  const setItem = (index: number, patch: Partial<LineItem>): void => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit || vehicleId === null) {
      return;
    }
    setSaving(true);
    const payload = {
      vehicleId,
      type,
      date,
      ...(odometer !== '' ? { odometer: Number(odometer) } : {}),
      ...(workshop ? { workshop } : {}),
      ...(description ? { description } : {}),
      items: items
        .filter((it) => it.name.trim() !== '')
        .map((it) => ({ name: it.name, qty: num(it.qty), unitPrice: num(it.unitPrice) })),
    };
    try {
      if (editing) {
        await maintenanceApi.update(editing.id, payload);
        notify.success('Perawatan diperbarui.');
      } else {
        await maintenanceApi.create(payload);
        notify.success('Perawatan dicatat.');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan perawatan.');
    } finally {
      setSaving(false);
    }
  };

  const heading = readOnly ? 'Detail Perawatan' : editing ? 'Ubah Perawatan' : 'Catat Perawatan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="sr-only">Formulir perawatan kendaraan</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-0.5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Kendaraan</Label>
              <Select
                value={vehicleId ?? undefined}
                onValueChange={(v) => setVehicleId(v)}
                disabled={readOnly || editing !== null}
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
              <Label required>Jenis</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as MaintenanceTypeValue)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label required>Tanggal</Label>
              <DatePicker
                value={date || undefined}
                onValueChange={(v) => setDate(v ?? '')}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Odometer</Label>
              <NumberInput
                value={odometer}
                onValueChange={(v) => setOdometer(Number.isNaN(v) ? '' : v)}
                unit="km"
                min={0}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bengkel</Label>
            <Input
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Uraian Pekerjaan</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ringkasan pekerjaan"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Item Biaya</Label>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Tambah
                </Button>
              ) : null}
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <span className="text-tiny text-neutral-500">Nama</span>
                  <Input
                    value={item.name}
                    onChange={(e) => setItem(i, { name: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div className="w-16 space-y-1">
                  <span className="text-tiny text-neutral-500">Qty</span>
                  <NumberInput
                    value={item.qty}
                    onValueChange={(v) => setItem(i, { qty: Number.isNaN(v) ? '' : v })}
                    min={0}
                    disabled={readOnly}
                  />
                </div>
                <div className="w-32 space-y-1">
                  <span className="text-tiny text-neutral-500">Harga</span>
                  <NumberInput
                    value={item.unitPrice}
                    onValueChange={(v) => setItem(i, { unitPrice: Number.isNaN(v) ? '' : v })}
                    min={0}
                    disabled={readOnly}
                  />
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Hapus item"
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="flex items-center justify-between rounded-base border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span className="text-label text-neutral-500">Total Biaya</span>
              <span className="text-body font-bold tabular-nums text-neutral-900">
                {formatRupiah(totalCost)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {readOnly ? 'Tutup' : 'Batal'}
          </Button>
          {!readOnly ? (
            <Button onClick={() => void onSubmit()} loading={saving} disabled={!canSubmit}>
              Simpan
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
