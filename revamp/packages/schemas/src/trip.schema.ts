import { z } from 'zod';

export const TripStatusEnum = z.enum(['IN_PROGRESS', 'DONE', 'VERIFIED']);
export type TripStatus = z.infer<typeof TripStatusEnum>;

const IsoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Waktu harus berformat ISO-8601' });

/**
 * Record a trip realization. The required category-specific fields (fuel for
 * REFUEL, weighing for DISPOSAL, tare for PICKUP) are enforced server-side
 * against the trip's route category — this schema keeps them optional so one
 * payload shape serves every trip type. `netWeight` is always computed
 * server-side (`grossWeight − tareWeight`); clients never send it.
 */
export const RecordTripSchema = z.object({
  actualTime: IsoDateTime,
  actualOdometer: z.coerce.number().int().min(0, 'Odometer tidak boleh negatif'),
  /** REFUEL */
  fuelRequestedLiters: z.coerce.number().nonnegative('Tidak boleh negatif').optional(),
  fuelApprovedLiters: z.coerce.number().nonnegative('Tidak boleh negatif').optional(),
  /** PICKUP / DISPOSAL */
  tareWeight: z.coerce.number().int().min(0, 'Berat tidak boleh negatif').optional(),
  /** DISPOSAL */
  grossWeight: z.coerce.number().int().positive('Berat kotor harus lebih dari 0').optional(),
  wasteVolume: z.coerce.number().int().min(0, 'Volume tidak boleh negatif').optional(),
  notes: z.string().trim().max(512).optional(),
});
export type RecordTripInput = z.infer<typeof RecordTripSchema>;
