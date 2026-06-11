'use client';

import { ArrowRight, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
  Badge,
  Button,
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
  type RouteDto,
  type TripTemplateDto,
  routesApi,
} from '@/lib/master-api';
import { createTripTemplate, deleteTripTemplate, listTripTemplates } from '@/lib/scheduling-api';

export interface TripTemplatesSheetProps {
  schedule: ScheduleTemplateDto | null;
  onOpenChange: (open: boolean) => void;
}

/** Manage the planned trips (Template Trip Terencana) for a schedule template. */
export function TripTemplatesSheet({
  schedule,
  onOpenChange,
}: TripTemplatesSheetProps): JSX.Element {
  const [templates, setTemplates] = useState<TripTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TripTemplateDto | null>(null);

  const { rows: routes } = useResourceList<RouteDto>(routesApi.list);

  const [routeId, setRouteId] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [fuel, setFuel] = useState('');
  const [saving, setSaving] = useState(false);

  const scheduleId = schedule?.id ?? null;

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
      setRouteId('');
      setTargetTime('');
      setFuel('');
      void reload();
    }
  }, [scheduleId, reload]);

  const onAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (scheduleId === null || !routeId || !targetTime) {
      return;
    }
    setSaving(true);
    try {
      await createTripTemplate(scheduleId, {
        routeId,
        targetTime,
        fuelRequestedLiters: fuel ? Number(fuel) : undefined,
      });
      notify.success('Template Trip ditambahkan.');
      setRouteId('');
      setTargetTime('');
      setFuel('');
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
                <Label htmlFor="tpl-route" required>
                  Rute
                </Label>
                <Select value={routeId || undefined} onValueChange={setRouteId}>
                  <SelectTrigger id="tpl-route">
                    <SelectValue placeholder="Pilih rute" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.originSiteName} → {r.destinationSiteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-time" required>
                    Target Waktu
                  </Label>
                  <Input
                    id="tpl-time"
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-fuel">BBM (L)</Label>
                  <Input
                    id="tpl-fuel"
                    type="number"
                    min={0}
                    step="0.01"
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" loading={saving} disabled={!routeId || !targetTime}>
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
