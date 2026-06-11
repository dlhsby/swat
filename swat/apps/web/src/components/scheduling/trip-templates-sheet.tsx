'use client';

import { ArrowRight, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
  Badge,
  Button,
  Combobox,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  notify,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { formatTime } from '@/lib/format';
import {
  type ScheduleTemplateDto,
  type RouteCategoryValue,
  type SiteDto,
  type SiteType,
  type TripTemplateDto,
  sitesApi,
} from '@/lib/master-api';
import { createTripTemplate, deleteTripTemplate, listTripTemplates } from '@/lib/scheduling-api';

export interface TripTemplatesSheetProps {
  schedule: ScheduleTemplateDto | null;
  onOpenChange: (open: boolean) => void;
}

const ROUTE_CATEGORIES: { value: RouteCategoryValue; label: string }[] = [
  { value: 'DEPART_POOL', label: 'Berangkat Pool' },
  { value: 'PICKUP', label: 'Ambil Sampah' },
  { value: 'DISPOSAL', label: 'Buang ke TPA' },
  { value: 'REFUEL', label: 'Isi BBM' },
  { value: 'RETURN_POOL', label: 'Kembali Pool' },
];

const SITE_TYPE_LABEL: Record<SiteType, string> = {
  POOL: 'Pool',
  SPBU: 'SPBU',
  TPS: 'TPS',
  TPA: 'TPA',
};

/**
 * Per leg category, which site TYPE the start / end must be. Mirrors Lokasi & Rute:
 * "Berangkat" leaves a Pool, "Ambil Sampah" ends at a TPS, "Buang ke TPA" ends at a
 * TPA, "Isi BBM" ends at an SPBU, "Kembali" ends at a Pool. An undefined end is
 * unconstrained (searchable across all sites).
 */
const ROUTE_SITE_CONSTRAINTS: Record<
  RouteCategoryValue,
  { origin?: SiteType; destination?: SiteType }
> = {
  DEPART_POOL: { origin: 'POOL' },
  REFUEL: { destination: 'SPBU' },
  PICKUP: { destination: 'TPS' },
  DISPOSAL: { destination: 'TPA' },
  RETURN_POOL: { destination: 'POOL' },
};

const siteOption = (s: SiteDto): { value: string; label: string } => ({
  value: s.id,
  label: `${s.name} · ${SITE_TYPE_LABEL[s.type]}`,
});

/** Manage the planned trips (Template Trip Terencana) for a schedule template. */
export function TripTemplatesSheet({
  schedule,
  onOpenChange,
}: TripTemplatesSheetProps): JSX.Element {
  const [templates, setTemplates] = useState<TripTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TripTemplateDto | null>(null);

  // Sites (not the full route catalogue) drive the picker: operators choose a leg
  // category, then a start and end location, and the backend resolves/creates the
  // matching route. This keeps the form light instead of listing ~5k routes.
  const { rows: sites } = useResourceList<SiteDto>(sitesApi.list);

  const [category, setCategory] = useState<RouteCategoryValue | ''>('');
  const [originSiteId, setOriginSiteId] = useState('');
  const [destinationSiteId, setDestinationSiteId] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [fuel, setFuel] = useState('');
  const [saving, setSaving] = useState(false);

  const scheduleId = schedule?.id ?? null;
  const constraint = category ? ROUTE_SITE_CONSTRAINTS[category] : {};
  const isRefuel = category === 'REFUEL';

  const originOptions = useMemo(
    () => sites.filter((s) => !constraint.origin || s.type === constraint.origin).map(siteOption),
    [sites, constraint.origin],
  );
  const destinationOptions = useMemo(
    () =>
      sites
        .filter((s) => !constraint.destination || s.type === constraint.destination)
        .map(siteOption),
    [sites, constraint.destination],
  );

  const resetForm = useCallback((): void => {
    setCategory('');
    setOriginSiteId('');
    setDestinationSiteId('');
    setTargetTime('');
    setFuel('');
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    if (scheduleId === null) {
      return;
    }
    setLoading(true);
    try {
      setTemplates(await listTripTemplates(scheduleId));
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat trayek.');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (scheduleId !== null) {
      resetForm();
      void reload();
    }
  }, [scheduleId, reload, resetForm]);

  // Drop a selection the newly chosen category no longer allows.
  useEffect(() => {
    if (originSiteId && constraint.origin) {
      const s = sites.find((x) => x.id === originSiteId);
      if (s && s.type !== constraint.origin) setOriginSiteId('');
    }
    if (destinationSiteId && constraint.destination) {
      const s = sites.find((x) => x.id === destinationSiteId);
      if (s && s.type !== constraint.destination) setDestinationSiteId('');
    }
    if (!isRefuel) setFuel('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const canSubmit = Boolean(category && originSiteId && destinationSiteId && targetTime);

  const onAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (scheduleId === null || !category || !originSiteId || !destinationSiteId || !targetTime) {
      return;
    }
    setSaving(true);
    try {
      await createTripTemplate(scheduleId, {
        category,
        originSiteId,
        destinationSiteId,
        targetTime,
        fuelRequestedLiters: isRefuel && fuel ? Number(fuel) : undefined,
      });
      notify.success('Template Trip ditambahkan.');
      resetForm();
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menambah trayek.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (): Promise<void> => {
    if (scheduleId === null || !deleteTarget) {
      return;
    }
    try {
      await deleteTripTemplate(scheduleId, deleteTarget.id);
      notify.success('Template Trip dihapus.');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus trayek.');
    }
  };

  return (
    <Sheet open={schedule !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,560px)]">
        <SheetHeader>
          <SheetTitle>
            Template Trip — {schedule?.vehiclePlate} · {schedule?.driverName}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {loading ? (
            <Skeleton className="h-24" />
          ) : templates.length === 0 ? (
            <EmptyState illustration="no-results" title="Belum ada trayek terencana" />
          ) : (
            <ol className="space-y-2">
              {templates.map((tpl, i) => (
                <li
                  key={tpl.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-tiny font-semibold text-neutral-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="flex items-center gap-1.5 text-body-sm font-medium text-neutral-900">
                        {tpl.routeLabel}
                      </p>
                      <p className="flex items-center gap-2 text-tiny text-neutral-500">
                        <Badge appearance="count">{tpl.routeCategory}</Badge>
                        <span>{formatTime(`1970-01-01T${tpl.targetTime}:00Z`)}</span>
                        {tpl.fuelRequestedLiters ? (
                          <span>· {tpl.fuelRequestedLiters} L</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <ProtectedAction permission="trip-template:delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger-600"
                      aria-label="Hapus trayek"
                      onClick={() => setDeleteTarget(tpl)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </ProtectedAction>
                </li>
              ))}
            </ol>
          )}

          <ProtectedAction permission="trip-template:create">
            <form
              onSubmit={(e) => void onAdd(e)}
              className="space-y-3 rounded-lg border border-neutral-200 p-3"
            >
              <p className="text-label font-semibold text-neutral-700">Tambah Template Trip</p>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-category" required>
                  Jenis Trayek
                </Label>
                <Select
                  value={category || undefined}
                  onValueChange={(v) => setCategory(v as RouteCategoryValue)}
                >
                  <SelectTrigger id="tpl-category">
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-origin" required>
                  Lokasi Asal
                </Label>
                <Combobox
                  options={originOptions}
                  value={originSiteId}
                  onValueChange={setOriginSiteId}
                  placeholder="Pilih lokasi asal"
                  searchPlaceholder="Cari lokasi…"
                  disabled={!category}
                />
                {constraint.origin ? (
                  <p className="text-tiny text-neutral-500">
                    Hanya lokasi {SITE_TYPE_LABEL[constraint.origin]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-dest" required>
                  Lokasi Tujuan
                </Label>
                <Combobox
                  options={destinationOptions}
                  value={destinationSiteId}
                  onValueChange={setDestinationSiteId}
                  placeholder="Pilih lokasi tujuan"
                  searchPlaceholder="Cari lokasi…"
                  disabled={!category}
                />
                {constraint.destination ? (
                  <p className="text-tiny text-neutral-500">
                    Hanya lokasi {SITE_TYPE_LABEL[constraint.destination]}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-time" required>
                    Target Waktu
                  </Label>
                  <Input
                    id="tpl-time"
                    type="time"
                    lang="id-ID"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                  />
                </div>
                {isRefuel ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-fuel">BBM Diajukan (L)</Label>
                    <Input
                      id="tpl-fuel"
                      type="number"
                      min={0}
                      step="0.01"
                      value={fuel}
                      onChange={(e) => setFuel(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <Button type="submit" loading={saving} disabled={!canSubmit}>
                <ArrowRight className="h-4 w-4" aria-hidden />
                Tambah Template Trip
              </Button>
            </form>
          </ProtectedAction>
        </SheetBody>
      </SheetContent>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Hapus trayek ini?"
        description="Template Trip terencana akan dihapus dari jadwal."
        confirmLabel="Hapus"
        onConfirm={() => void onDelete()}
      />
    </Sheet>
  );
}
