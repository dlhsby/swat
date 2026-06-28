import { z } from 'zod';

import { IsoDateSchema } from './common.schema';

/**
 * Weighbridge integration contracts (Phase 4, specs/09-modules/integration-weighbridge.md).
 * Shared between the backend (request validation + response typing) and any
 * TypeScript client. Weights are integer kilograms; `netWeight` is ALWAYS
 * computed server-side and never accepted from the client.
 */

const PlateNumberSchema = z.string().trim().min(1).max(20);
const WeightKgSchema = z.number().int().nonnegative('Berat tidak boleh negatif');

/** Resolve a kitir by `code` OR `plateNumber` (at least one required) for a date. */
export const ResolveKitirSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    plateNumber: PlateNumberSchema.optional(),
    date: IsoDateSchema,
  })
  .refine((value) => Boolean(value.code) || Boolean(value.plateNumber), {
    message: 'Harus menyediakan code atau plateNumber',
    path: ['code'],
  });
export type ResolveKitirInput = z.infer<typeof ResolveKitirSchema>;

export interface ResolvedKitir {
  readonly id: string;
  readonly vehicleId: string;
  readonly plateNumber: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly status: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly vehicle: {
    readonly brand: string;
    readonly currentTareWeight: number;
    readonly normalTareWeight: number;
    readonly maxNetLoad: number;
    readonly maxNetVolume: number;
  };
}

/** Post a weighing result. `verified:true` marks the resulting Trip VERIFIED. */
export const PostWeighingSchema = z.object({
  kitirId: z.string().uuid('kitirId harus berupa UUID').optional(),
  plateNumber: PlateNumberSchema,
  date: IsoDateSchema,
  timestamp: z.string().datetime({ offset: true }).optional(),
  grossWeight: WeightKgSchema,
  tareWeight: WeightKgSchema,
  wasteVolume: z.number().int().nonnegative().optional(),
  cctvReference: z.string().trim().max(256).optional(),
  notes: z.string().trim().max(512).optional(),
  verified: z.boolean().optional(),
});
export type PostWeighingInput = z.infer<typeof PostWeighingSchema>;

/** Patch an already-recorded weighing (parity: updatePembuanganTerverifikasi). */
export const UpdateWeighingSchema = z.object({
  grossWeight: WeightKgSchema.optional(),
  tareWeight: WeightKgSchema.optional(),
  wasteVolume: z.number().int().nonnegative().optional(),
  cctvReference: z.string().trim().max(256).optional(),
  notes: z.string().trim().max(512).optional(),
  verified: z.boolean().optional(),
});
export type UpdateWeighingInput = z.infer<typeof UpdateWeighingSchema>;

export interface WeighingResult {
  readonly id: string;
  readonly kitirId: string | null;
  readonly tripId: string;
  readonly netWeight: number;
  readonly recordedAt: string;
  readonly cctvReference: string | null;
}

/** Filter weighings (parity: getpembuangansampahbyfilter). */
export const ListWeighingsSchema = z.object({
  date: IsoDateSchema.optional(),
  plateNumber: PlateNumberSchema.optional(),
  siteId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});
export type ListWeighingsInput = z.infer<typeof ListWeighingsSchema>;
