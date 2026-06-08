import { z } from 'zod';

/** Pagination query params. Defaults: page 1, limit 20 (max 100). */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Halaman minimal 1').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Maksimal 100 baris per halaman').default(20),
  sort: z.string().trim().min(1).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

/** A positive integer id path param. */
export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});
export type IdParam = z.infer<typeof IdParamSchema>;

/** Reusable id-ID date string `yyyy-MM-dd`. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD');
