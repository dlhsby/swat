/**
 * Archiving types (Phase 2, Epic 2.5). A "partition ref" identifies one monthly
 * child partition (e.g. `trip_y2024m03`) and its period (`2024-03`).
 */

export interface PartitionRef {
  readonly tableName: string;
  readonly period: string; // YYYY-MM
}

export interface ArchiveOutcome {
  readonly tableName: string;
  readonly period: string;
  readonly status: 'archived' | 'skipped-cataloged' | 'skipped-rollups-incomplete' | 'failed';
  readonly detail?: string;
}

export interface ArchiveSummary {
  readonly cutoffPeriod: string;
  readonly outcomes: ArchiveOutcome[];
}

export interface ReattachOutcome {
  readonly tableName: string;
  readonly period: string;
  readonly rowCount: number;
  readonly checksumVerified: boolean;
}
