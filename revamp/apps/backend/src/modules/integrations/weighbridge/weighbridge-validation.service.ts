import { Injectable } from '@nestjs/common';

/** Vehicle limits used to flag (not block) data-quality issues on a weighing. */
export interface WeighingLimits {
  readonly maxNetLoad: number;
  readonly maxNetVolume: number;
}

export interface WeighingValidation {
  readonly valid: boolean;
  /** Net weight = gross − tare; only meaningful when `valid`. */
  readonly netWeight: number;
  /** Hard failure reason (gross < tare, negatives) — caller maps to 422. */
  readonly error?: string;
  /** Soft data-quality flags (e.g. over max load); recorded, never blocking. */
  readonly warnings: readonly string[];
}

/**
 * Pure weighing validation + server-side net-weight computation (Phase 4, T-405).
 * CRITICAL: `netWeight` is always `gross − tare` computed here — the client's net
 * is never trusted. Hard rules reject (gross < tare, negatives); over-capacity is
 * a warning so an overloaded but real arrival is still recorded.
 */
@Injectable()
export class WeighbridgeValidationService {
  validateWeighing(
    grossWeight: number,
    tareWeight: number,
    wasteVolume: number | undefined,
    limits: WeighingLimits,
  ): WeighingValidation {
    if (!Number.isFinite(grossWeight) || !Number.isFinite(tareWeight)) {
      return { valid: false, netWeight: 0, error: 'Berat tidak valid', warnings: [] };
    }
    if (grossWeight < 0 || tareWeight < 0) {
      return { valid: false, netWeight: 0, error: 'Berat tidak boleh negatif', warnings: [] };
    }
    if (grossWeight < tareWeight) {
      return {
        valid: false,
        netWeight: 0,
        error: 'Berat kotor tidak boleh lebih kecil dari berat kosong',
        warnings: [],
      };
    }

    const netWeight = grossWeight - tareWeight;
    const warnings: string[] = [];
    if (limits.maxNetLoad > 0 && netWeight > limits.maxNetLoad) {
      warnings.push(
        `Berat bersih (${netWeight} kg) melebihi muatan maksimum (${limits.maxNetLoad} kg)`,
      );
    }
    if (wasteVolume !== undefined && limits.maxNetVolume > 0 && wasteVolume > limits.maxNetVolume) {
      warnings.push(`Volume (${wasteVolume}) melebihi volume maksimum (${limits.maxNetVolume})`);
    }
    return { valid: true, netWeight, warnings };
  }
}
