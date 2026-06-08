/**
 * Keyset pagination + resumable watermark for the high-volume transactional load
 * (`specs/04-migration.md` §3.1). The fetch function is injected (mysql2 in the
 * orchestrator), so this stays unit-testable without a database.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Yield batches of rows ordered by an increasing integer key, never holding the
 * whole table in memory. Stops when a fetch returns fewer than `batchSize` rows.
 */
export async function* keysetBatches<T>(
  fetchBatch: (afterId: number, limit: number) => Promise<T[]>,
  idOf: (row: T) => number,
  batchSize: number,
  startAfter = 0,
): AsyncGenerator<{ rows: T[]; lastId: number }> {
  let cursor = startAfter;
  for (;;) {
    const rows = await fetchBatch(cursor, batchSize);
    if (rows.length === 0) {
      return;
    }
    const lastId = idOf(rows[rows.length - 1] as T);
    yield { rows, lastId };
    if (rows.length < batchSize) {
      return;
    }
    cursor = lastId;
  }
}

type WatermarkFile = Record<string, number>;

function read(path: string): WatermarkFile {
  if (!existsSync(path)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as WatermarkFile;
  } catch {
    return {};
  }
}

/** Last successfully-migrated id for a table (0 if none). Drives `--resume`. */
export function readWatermark(path: string, table: string): number {
  return read(path)[table] ?? 0;
}

export function writeWatermark(path: string, table: string, lastId: number): void {
  const data = read(path);
  data[table] = lastId;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}
