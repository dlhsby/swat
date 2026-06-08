import { z } from 'zod';

export const VehicleStatusEnum = z.enum(['GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST']);

export const VehicleCreateSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .min(1, 'Nomor polisi wajib diisi')
    .max(10, 'Nomor polisi maksimal 10 karakter'),
  modelId: z.coerce.number().int().positive('Model kendaraan wajib dipilih'),
  poolSiteId: z.coerce.number().int().positive('Pool wajib dipilih'),
  status: VehicleStatusEnum.default('GOOD'),
  chassisNumber: z.string().trim().min(1, 'Nomor rangka wajib diisi').max(100),
  engineNumber: z.string().trim().min(1, 'Nomor mesin wajib diisi').max(100),
  manufactureYear: z.coerce
    .number()
    .int()
    .min(1900, 'Tahun tidak valid')
    .max(new Date().getUTCFullYear() + 1, 'Tahun tidak valid')
    .optional(),
  currentTareWeight: z.coerce.number().int().min(0, 'Berat kosong tidak valid'),
  currentOdometer: z.coerce.number().int().min(0, 'Kilometer tidak valid'),
  registrationExpiry: z.coerce.date({ message: 'Masa berlaku STNK tidak valid' }),
  taxExpiry: z.coerce.date({ message: 'Masa berlaku pajak tidak valid' }),
  notes: z.string().trim().max(512).optional(),
});
export type VehicleCreateInput = z.infer<typeof VehicleCreateSchema>;
