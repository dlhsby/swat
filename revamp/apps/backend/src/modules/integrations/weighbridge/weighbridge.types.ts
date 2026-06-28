/**
 * Backend-local response shapes for the weighbridge API (Phase 4). Mirror the
 * zod contracts in `@swat/schemas` (consumed by the frontend); the backend keeps
 * its own copy because it validates requests with class-validator DTOs and does
 * not depend on `@swat/schemas`.
 */

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

export interface WeighingResult {
  readonly id: string;
  readonly kitirId: string | null;
  readonly tripId: string;
  readonly netWeight: number;
  readonly recordedAt: string;
  readonly cctvReference: string | null;
}

export interface WeighingListItem {
  readonly tripId: string;
  readonly date: string;
  readonly plateNumber: string;
  readonly siteId: string | null;
  readonly siteName: string | null;
  readonly grossWeight: number | null;
  readonly tareWeight: number | null;
  readonly netWeight: number | null;
  readonly wasteVolume: number | null;
  readonly status: string;
  readonly cctvReference: string | null;
  readonly recordedAt: string;
}
