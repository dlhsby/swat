import { z } from 'zod';

export const DayStatusEnum = z.enum(['IN_PROGRESS', 'DONE']);
export type DayStatus = z.infer<typeof DayStatusEnum>;

/** Update a transaction day's lifecycle status (mark DONE when hauls complete). */
export const TransactionDayUpdateSchema = z.object({
  status: DayStatusEnum,
});
export type TransactionDayUpdateInput = z.infer<typeof TransactionDayUpdateSchema>;
