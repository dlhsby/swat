'use client';

import { z } from 'zod';

import { NumberField, type SelectOption, SelectField, SwitchField, TextField } from '@/components/crud/fields';

/** Device-type options — shared by the registry page and the per-vehicle sheet. */
export const DEVICE_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'gps-hardware', label: 'Perangkat keras GPS' },
  { value: 'mobile-app', label: 'Aplikasi ponsel' },
];

/**
 * Canonical GPS-device field schema (single source of truth) — everything EXCEPT
 * `vehicleId`, which the registry page adds (it's implicit in the vehicle sheet).
 * Keeps the two device-management surfaces field-for-field identical.
 */
export const deviceFieldsSchema = z.object({
  deviceId: z.string().min(1, 'ID perangkat / IMEI wajib diisi').max(64),
  // Optional — '' clears it; the backend defaults the IMEI from deviceId for hardware.
  imei: z
    .union([z.string().regex(/^\d{6,20}$/, 'IMEI harus 6–20 digit angka'), z.literal('')])
    .optional(),
  deviceType: z.enum(['gps-hardware', 'mobile-app']),
  provider: z.string().min(1, 'Penyedia wajib diisi').max(20),
  priority: z.coerce.number().int().min(0).max(100),
  active: z.boolean(),
});
export type DeviceFieldsValues = z.infer<typeof deviceFieldsSchema>;

export const deviceFieldsDefaults: DeviceFieldsValues = {
  deviceId: '',
  imei: '',
  deviceType: 'gps-hardware',
  provider: 'gpsid',
  priority: 0,
  active: true,
};

/** Drop an empty IMEI so the backend regex doesn't reject '' (it defaults from deviceId). */
export function dropEmptyImei(values: Record<string, unknown>): Record<string, unknown> {
  const { imei, ...rest } = values;
  return imei ? { ...rest, imei } : rest;
}

/**
 * Shared GPS-device form fields (RHF). Renders inside any react-hook-form context
 * (the registry's CrudFormDialog or the vehicle sheet's own `<Form>`), so both the
 * `/tracking/devices` page and the per-vehicle "Perangkat GPS" sheet expose exactly
 * the same fields. `vehicleId` is rendered separately by the registry page only.
 */
export function GpsDeviceFields(): JSX.Element {
  return (
    <>
      <TextField
        name="deviceId"
        label="ID Perangkat / IMEI"
        required
        placeholder="mis. 350000000000999"
      />
      <TextField name="imei" label="IMEI" placeholder="Opsional — default mengikuti ID perangkat" />
      <SelectField
        name="deviceType"
        label="Jenis Perangkat"
        required
        options={DEVICE_TYPE_OPTIONS}
        placeholder="Pilih jenis"
      />
      <TextField name="provider" label="Penyedia" required placeholder="gpsid" />
      <NumberField name="priority" label="Prioritas" required min={0} max={100} />
      <SwitchField name="active" label="Aktif" />
    </>
  );
}
