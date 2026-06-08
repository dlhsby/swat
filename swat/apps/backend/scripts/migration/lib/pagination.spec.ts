import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { keysetBatches, readWatermark, writeWatermark } from './pagination';

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
