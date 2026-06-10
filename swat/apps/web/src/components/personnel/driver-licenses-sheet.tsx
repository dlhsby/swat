'use client';

import { Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
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
  StatusPill,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay } from '@/lib/format';
import { type DriverDto, type DriverLicenseDto, type LicenseClassDto } from '@/lib/master-api';
import {
  createDriverLicense,
  licenseClassesApi,
  listDriverLicenses,
  revokeDriverLicense,
} from '@/lib/personnel-api';

/** Derive the license status enum for the pill from the expiry date. */
function licenseStatus(license: DriverLicenseDto): string {
  if (license.expired) {
    return 'EXPIRED';
  }
  const days = (new Date(license.expiry).getTime() - Date.now()) / 86_400_000;
  return days <= 30 ? 'EXPIRING' : 'VALID';
}

export interface DriverLicensesSheetProps {
  driver: DriverDto | null;
  onOpenChange: (open: boolean) => void;
}

/** Right-side sheet to issue and revoke a driver's SIM (licenses). */
export function DriverLicensesSheet({
  driver,
  onOpenChange,
}: DriverLicensesSheetProps): JSX.Element {
  const [licenses, setLicenses] = useState<DriverLicenseDto[]>([]);
  const [classes, setClasses] = useState<LicenseClassDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DriverLicenseDto | null>(null);

  const [classId, setClassId] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  const driverId = driver?.id ?? null;

  const reload = useCallback(async (): Promise<void> => {
    if (driverId === null) {
      return;
    }
    setLoading(true);
    try {
      const [list, cls] = await Promise.all([
        listDriverLicenses(driverId),
        licenseClassesApi.list(),
      ]);
      setLicenses(list);
      setClasses(cls);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat SIM.');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId !== null) {
      setClassId('');
      setNumber('');
      setExpiry('');
      void reload();
    }
  }, [driverId, reload]);

  const onAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (driverId === null || !classId || !number || !expiry) {
      return;
    }
    setSaving(true);
    try {
      await createDriverLicense(driverId, {
        licenseClassId: classId,
        licenseNumber: number,
        expiry,
      });
      notify.success('SIM ditambahkan.');
      setClassId('');
      setNumber('');
      setExpiry('');
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menambah SIM.');
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async (): Promise<void> => {
    if (driverId === null || !revokeTarget) {
      return;
    }
    try {
      await revokeDriverLicense(driverId, revokeTarget.id);
      notify.success('SIM dicabut.');
      setRevokeTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mencabut SIM.');
    }
  };

  return (
    <Sheet open={driver !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,520px)]">
        <SheetHeader>
          <SheetTitle>SIM — {driver?.name}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {loading ? (
            <Skeleton className="h-24" />
          ) : licenses.length === 0 ? (
            <EmptyState illustration="no-results" title="Belum ada SIM" />
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
              {licenses.map((license) => (
                <li key={license.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-body-sm font-medium text-neutral-900">
                      {license.licenseClassName} ·{' '}
                      <span className="font-mono">{license.licenseNumber}</span>
                    </p>
                    <p className="text-tiny text-neutral-500">
                      Berlaku s.d. {formatDateDisplay(license.expiry)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill domain="license" value={licenseStatus(license)} />
                    <ProtectedAction permission="license:delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-danger-600"
                        aria-label="Cabut SIM"
                        onClick={() => setRevokeTarget(license)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </ProtectedAction>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <ProtectedAction permission="license:create">
            <form
              onSubmit={(e) => void onAdd(e)}
              className="space-y-3 rounded-lg border border-neutral-200 p-3"
            >
              <p className="text-label font-semibold text-neutral-700">Tambah SIM</p>
              <div className="space-y-1.5">
                <Label htmlFor="lic-class" required>
                  Golongan
                </Label>
                <Select value={classId || undefined} onValueChange={setClassId}>
                  <SelectTrigger id="lic-class">
                    <SelectValue placeholder="Pilih golongan" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lic-number" required>
                  Nomor SIM
                </Label>
                <Input
                  id="lic-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  maxLength={12}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lic-expiry" required>
                  Berlaku Sampai
                </Label>
                <Input
                  id="lic-expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
              <Button type="submit" loading={saving} disabled={!classId || !number || !expiry}>
                Tambah SIM
              </Button>
            </form>
          </ProtectedAction>
        </SheetBody>
      </SheetContent>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Cabut SIM ini?"
        description="SIM yang dicabut akan dihapus dari pengemudi."
        confirmLabel="Cabut"
        onConfirm={() => void onRevoke()}
      />
    </Sheet>
  );
}
