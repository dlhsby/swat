import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  distinctKeys,
  fetchExistingLegacyIds,
  keysetBatches,
  readWatermark,
  resolveParents,
  writeWatermark,
} from './pagination';

describe('keysetBatches', () => {
  it('walks all rows in id order without overlap, stopping on a short batch', async () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
    const fetchBatch = async (afterId: number, limit: number): Promise<{ id: number }[]> =>
      data.filter((r) => r.id > afterId).slice(0, limit);

    const seen: number[] = [];
    let batches = 0;
    for await (const { rows } of keysetBatches(fetchBatch, (r) => r.id, 10)) {
      batches += 1;
      seen.push(...rows.map((r) => r.id));
    }
    expect(seen).toEqual(data.map((r) => r.id));
    expect(batches).toBe(3); // 10 + 10 + 5
  });

  it('resumes from a start cursor', async () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const fetchBatch = async (afterId: number, limit: number): Promise<{ id: number }[]> =>
      data.filter((r) => r.id > afterId).slice(0, limit);
    const seen: number[] = [];
    for await (const { rows } of keysetBatches(fetchBatch, (r) => r.id, 10, 3)) {
      seen.push(...rows.map((r) => r.id));
    }
    expect(seen).toEqual([4, 5]);
  });

  it('emits nothing for an empty source', async () => {
    const seen: number[] = [];
    for await (const { rows } of keysetBatches(
      async () => [],
      (r: { id: number }) => r.id,
      10,
    )) {
      seen.push(...rows.map((r) => r.id));
    }
    expect(seen).toEqual([]);
  });
});

describe('watermark file', () => {
  it('round-trips per-table watermarks', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'wm-')), 'wm.json');
    expect(readWatermark(path, 'trip')).toBe(0);
    writeWatermark(path, 'trip', 123);
    writeWatermark(path, 'haul', 7);
    expect(readWatermark(path, 'trip')).toBe(123);
    expect(readWatermark(path, 'haul')).toBe(7);
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({ trip: 123, haul: 7 });
  });

  it('returns 0 for a missing file', () => {
    expect(readWatermark(join(tmpdir(), 'does-not-exist-xyz.json'), 'trip')).toBe(0);
  });
});

describe('distinctKeys', () => {
  it('collects unique, defined numeric keys', () => {
    const rows = [{ p: 5 }, { p: 5 }, { p: 7 }, { p: null }, { p: undefined }];
    expect(distinctKeys(rows, (r) => r.p).sort((a, b) => a - b)).toEqual([5, 7]);
  });

  it('returns [] for an empty batch', () => {
    expect(distinctKeys([] as { p: number }[], (r) => r.p)).toEqual([]);
  });
});

describe('resolveParents', () => {
  it('maps each legacy id to its parent row (keyed by numeric legacyId)', async () => {
    const parents = [
      { legacyId: 10n, id: 'a', date: 'd10' },
      { legacyId: 11n, id: 'b', date: 'd11' },
    ];
    const find = async (ids: number[]): Promise<typeof parents> =>
      parents.filter((p) => ids.includes(Number(p.legacyId)));

    const map = await resolveParents([10, 11], find);
    expect(map.get(10)).toEqual({ legacyId: 10n, id: 'a', date: 'd10' });
    expect(map.get(11)?.id).toBe('b');
    expect(map.size).toBe(2);
  });

  it('short-circuits (no DB call) on an empty id list', async () => {
    let called = false;
    const map = await resolveParents([], async () => {
      called = true;
      return [];
    });
    expect(called).toBe(false);
    expect(map.size).toBe(0);
  });
});

describe('fetchExistingLegacyIds', () => {
  it('returns the subset of batch ids already present (bigint legacyId)', async () => {
    const present = new Set([2n, 4n]);
    const find = async (ids: number[]): Promise<{ legacyId: bigint }[]> =>
      ids.filter((i) => present.has(BigInt(i))).map((i) => ({ legacyId: BigInt(i) }));

    const got = await fetchExistingLegacyIds([1, 2, 3, 4], find);
    expect([...got].sort((a, b) => a - b)).toEqual([2, 4]);
  });

  it('short-circuits on an empty batch', async () => {
    let called = false;
    const got = await fetchExistingLegacyIds([], async () => {
      called = true;
      return [];
    });
    expect(called).toBe(false);
    expect(got.size).toBe(0);
  });
});
