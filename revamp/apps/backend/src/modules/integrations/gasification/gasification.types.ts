/**
 * Gasification integration (PT Surveyor Indonesia / PTSI) — shared types + helpers.
 *
 * PTSI runs the gasification intake at the TPA: a tally operator photographs each
 * truck diverted to the gasification gate and records it in their system. SWAT polls
 * their API per date and matches each record to the corresponding DISPOSAL trip.
 */

/** One raw record from the PTSI `/Api/cari` response `data[]` array. */
export interface PtsiRawRecord {
  readonly nopol?: unknown;
  readonly tanggal_masuk?: unknown;
  readonly jam_masuk?: unknown;
  readonly user_tally?: unknown;
  readonly foto?: unknown;
}

/** A PTSI record normalized into SWAT's domain shape (WIB instants, clean plate). */
export interface GasificationRecord {
  /** Raw plate as PTSI reported it (kept for audit + display). */
  readonly vendorNopol: string;
  /** Normalized plate (alphanumeric, uppercase) for matching + dedup. */
  readonly plateNumber: string;
  /** UTC instant of the WIB wall-clock entry time (tanggal_masuk + jam_masuk). */
  readonly enteredAt: Date;
  /** The WIB operation day (`@db.Date`, UTC-midnight) the entry falls on. */
  readonly operationDate: Date;
  readonly userTally: string | null;
  /** Photo filename on the PTSI photo host (appended to the photo base URL). */
  readonly fotoFilename: string;
  /** The untouched source object, persisted for audit. */
  readonly raw: PtsiRawRecord;
}

/** Outcome of a per-date sync run (manual or scheduled). */
export interface GasificationSyncResult {
  readonly date: string;
  readonly fetched: number;
  readonly upserted: number;
  readonly matched: number;
  readonly skipped: number;
}

/**
 * Canonicalize a plate for matching/dedup: drop every non-alphanumeric character
 * and uppercase. Handles `L 9647 CM` / `l9647cm` / `L-9647-CM` → `L9647CM`, so a
 * PTSI plate matches the SWAT vehicle master regardless of spacing/case. Returns
 * '' for a blank/undefined input (callers skip those).
 */
export function normalizePlate(raw: string | null | undefined): string {
  return (raw ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
