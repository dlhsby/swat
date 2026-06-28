/**
 * Row-count reconciliation + report rendering (pure). The verify step compares
 * legacy vs migrated counts per table; a mismatch beyond tolerance is "critical"
 * and fails the run (exit 1). See `specs/04-migration.md` §8.
 */

export interface ReconcileRow {
  readonly table: string;
  readonly legacy: number;
  readonly migrated: number;
  /** Signed difference (migrated − legacy); negatives mean rows were dropped. */
  readonly diff: number;
  readonly variancePct: number;
  readonly ok: boolean;
  /** Documented intentional drops (e.g. deduped routes) that excuse a shortfall. */
  readonly expectedDrop?: number;
}

const DEFAULT_TOLERANCE_PCT = 1;

/** True when the migrated count is within `tolerancePct` of legacy (after expected drops). */
export function withinTolerance(
  legacy: number,
  migrated: number,
  tolerancePct = DEFAULT_TOLERANCE_PCT,
  expectedDrop = 0,
): boolean {
  const target = legacy - expectedDrop;
  if (target === 0) {
    return migrated === 0;
  }
  return (Math.abs(migrated - target) / Math.abs(target)) * 100 <= tolerancePct;
}

export function reconcileRow(
  table: string,
  legacy: number,
  migrated: number,
  tolerancePct = DEFAULT_TOLERANCE_PCT,
  expectedDrop = 0,
): ReconcileRow {
  const target = legacy - expectedDrop;
  const variancePct =
    target === 0
      ? migrated === 0
        ? 0
        : 100
      : (Math.abs(migrated - target) / Math.abs(target)) * 100;
  return {
    table,
    legacy,
    migrated,
    diff: migrated - legacy,
    variancePct: Math.round(variancePct * 100) / 100,
    ok: withinTolerance(legacy, migrated, tolerancePct, expectedDrop),
    ...(expectedDrop ? { expectedDrop } : {}),
  };
}

export interface MigrationReport {
  readonly generatedAt: string;
  readonly source: string;
  readonly target: string;
  readonly rows: ReconcileRow[];
  readonly dataQuality: Record<string, number>;
  readonly security: Record<string, number | boolean>;
  readonly fkIntegrityPassed: boolean;
}

/** Any failing reconciliation row makes the whole run critical (verify exits 1). */
export function hasCriticalFailures(report: MigrationReport): boolean {
  return report.rows.some((r) => !r.ok) || !report.fkIntegrityPassed;
}

export function renderReportMarkdown(report: MigrationReport): string {
  const lines: string[] = [];
  lines.push('# Migration verification report', '');
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Source:** ${report.source}`);
  lines.push(`- **Target:** ${report.target}`);
  lines.push(`- **FK integrity:** ${report.fkIntegrityPassed ? '✓ passed' : '✗ FAILED'}`);
  lines.push(
    `- **Result:** ${hasCriticalFailures(report) ? '✗ CRITICAL — review required' : '✓ within tolerance'}`,
  );
  lines.push('', '## Row-count reconciliation', '');
  lines.push('| Table | Legacy | Migrated | Diff | Variance % | Status |');
  lines.push('|-------|-------:|---------:|-----:|-----------:|:------:|');
  for (const r of report.rows) {
    const note = r.expectedDrop ? ` (−${r.expectedDrop} expected)` : '';
    lines.push(
      `| ${r.table} | ${r.legacy} | ${r.migrated} | ${r.diff}${note} | ${r.variancePct} | ${r.ok ? '✓' : '✗'} |`,
    );
  }
  lines.push('', '## Data-quality fixes', '');
  for (const [k, v] of Object.entries(report.dataQuality)) {
    lines.push(`- **${k}:** ${v}`);
  }
  lines.push('', '## Security actions', '');
  for (const [k, v] of Object.entries(report.security)) {
    lines.push(`- **${k}:** ${v}`);
  }
  return `${lines.join('\n')}\n`;
}
