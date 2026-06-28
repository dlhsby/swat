import { z } from 'zod';

/** ISO-8601 timestamp string (e.g. `2026-06-08T05:30:00.000Z`). */
const IsoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Waktu harus berformat ISO-8601' });

/**
 * Record the departure leg of a haul assignment: the vehicle leaving the pool.
 * `actualOdometer` must be monotonic vs the vehicle's current odometer
 * (enforced server-side).
 */
export const RecordDepartSchema = z.object({
  actualOdometer: z.coerce.number().int().min(0, 'Odometer tidak boleh negatif'),
  actualTime: IsoDateTime,
});
export type RecordDepartInput = z.infer<typeof RecordDepartSchema>;

/**
 * Record the return leg: the vehicle arriving back at the pool. Closes the
 * assignment and advances the vehicle's odometer (enforced server-side).
 */
export const RecordReturnSchema = z.object({
  actualOdometer: z.coerce.number().int().min(0, 'Odometer tidak boleh negatif'),
  actualTime: IsoDateTime,
});
export type RecordReturnInput = z.infer<typeof RecordReturnSchema>;
