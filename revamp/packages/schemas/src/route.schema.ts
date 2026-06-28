import { z } from 'zod';

export const RouteCategoryEnum = z.enum([
  'DEPART_POOL',
  'REFUEL',
  'PICKUP',
  'DISPOSAL',
  'RETURN_POOL',
]);

export const RouteCreateSchema = z
  .object({
    category: RouteCategoryEnum,
    originSiteId: z.coerce.number().int().positive('Lokasi asal wajib dipilih'),
    destinationSiteId: z.coerce.number().int().positive('Lokasi tujuan wajib dipilih'),
    distanceKm: z.coerce.number().int().min(0, 'Jarak tidak boleh negatif'),
  })
  .refine((data) => data.originSiteId !== data.destinationSiteId, {
    message: 'Lokasi asal dan tujuan tidak boleh sama',
    path: ['destinationSiteId'],
  });
export type RouteCreateInput = z.infer<typeof RouteCreateSchema>;
