import { z } from 'zod';

export const EmploymentStatusEnum = z.enum(['SATGAS', 'PNS', 'HONORER']);

export const DriverCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  poolSiteId: z.coerce.number().int().positive('Pool wajib dipilih'),
  employmentStatus: EmploymentStatusEnum,
  idCardNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus 16 digit'),
  originAddress: z.string().trim().min(1, 'Alamat asal wajib diisi').max(256),
  currentAddress: z.string().trim().min(1, 'Alamat domisili wajib diisi').max(256),
  birthDate: z.coerce.date({ message: 'Tanggal lahir tidak valid' }),
  contact: z.string().trim().min(1, 'Kontak wajib diisi').max(100),
  notes: z.string().trim().max(256).optional(),
});
export type DriverCreateInput = z.infer<typeof DriverCreateSchema>;
