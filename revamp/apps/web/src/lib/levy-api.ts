import { makeResourceApi } from './resource-api';

/** A levy (retribusi) record. `amount` is integer IDR. */
export interface LevyDto {
  readonly id: string;
  readonly categoryName: string;
  /** Levy date as `YYYY-MM-DD`. */
  readonly date: string;
  readonly amount: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** CRUD client for `/levies` (gated by `levy:*`). */
export const levyApi = makeResourceApi<LevyDto>('/levies');
