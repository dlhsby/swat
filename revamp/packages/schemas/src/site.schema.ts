import { z } from 'zod';

export const SiteTypeEnum = z.enum(['POOL', 'SPBU', 'TPS', 'TPA']);

export const SiteCreateSchema = z.object({
  type: SiteTypeEnum,
  name: z.string().trim().min(1, 'Nama lokasi wajib diisi').max(256),
  address: z.string().trim().min(1, 'Alamat wajib diisi').max(512),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
export type SiteCreateInput = z.infer<typeof SiteCreateSchema>;
