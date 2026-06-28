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

/** Distinct, defined numeric keys in a batch — the inputs to a per-batch FK lookup. */
export function distinctKeys<T>(
  rows: readonly T[],
  keyOf: (row: T) => number | null | undefined,
): number[] {
  const set = new Set<number>();
  for (const row of rows) {
    const k = keyOf(row);
    if (k != null) set.add(k);
  }
  return [...set];
}

/**
 * Resolve a batch's legacy ids to their parent rows via an injected finder
 * (the Prisma `findMany` is supplied by the caller, so this file stays
 * DB-agnostic and unit-testable), returning a Map keyed by the numeric legacy id.
 * Used for the big parent chains (TransactionDay→Haul, Haul→HaulAssignment,
 * HaulAssignment→Trip) so we never hold a full parent table in memory.
 */
export async function resolveParents<V extends { legacyId: bigint | number | null }>(
  legacyIds: readonly number[],
  find: (ids: number[]) => Promise<V[]>,
): Promise<Map<number, V>> {
  if (legacyIds.length === 0) return new Map();
  const rows = await find([...legacyIds]);
  return new Map(rows.map((r) => [Number(r.legacyId), r]));
}

/**
 * Which of `batchIds` already exist in the target table — the idempotency probe
 * for partitioned tables whose `legacyId` is indexed but NOT unique (HaulAssignment,
 * Trip), so `createMany({ skipDuplicates })` can't dedupe them. The finder is the
 * caller's Prisma `findMany({ where: { legacyId: { in } }, select: { legacyId } })`.
 */
export async function fetchExistingLegacyIds<V extends { legacyId: bigint | number | null }>(
  batchIds: readonly number[],
  find: (ids: number[]) => Promise<V[]>,
): Promise<Set<number>> {
  if (batchIds.length === 0) return new Set();
  const rows = await find([...batchIds]);
  return new Set(rows.map((r) => Number(r.legacyId)));
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
