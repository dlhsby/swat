import { describe, expect, it } from 'vitest';

import { siteStyle, vehicleColor } from '../hauling-map';

describe('siteStyle', () => {
  it('gives each known site type a distinct colour + glyph', () => {
    const tpa = siteStyle('TPA');
    const tps = siteStyle('TPS');
    const spbu = siteStyle('SPBU');
    const pool = siteStyle('POOL');

    const all = [tpa, tps, spbu, pool];
    expect(new Set(all.map((s) => s.color)).size).toBe(4); // no two types share a colour
    expect(new Set(all.map((s) => s.letter)).size).toBe(4); // no two types share a glyph
    expect(tpa.label).toContain('TPA');
    expect(tps.label).toContain('TPS');
  });

  it('falls back to a neutral style + first-letter glyph for an unknown type', () => {
    const style = siteStyle('WAREHOUSE');
    expect(style.letter).toBe('W');
    expect(style.label).toBe('WAREHOUSE');
  });
});

describe('vehicleColor', () => {
  const base = {
    vehicleId: 'v1',
    plate: 'L 1234 AB',
    latitude: -7.25,
    longitude: 112.75,
    asOf: '2026-07-05T00:00:00.000Z',
    speedKmh: null,
    heading: null,
    legLabel: null,
  };

  it('colours a live-gps online vehicle green', () => {
    expect(vehicleColor({ ...base, source: 'live-gps', status: 'online' })).toBe('#15803d');
  });

  it('colours a live-gps offline vehicle grey', () => {
    expect(vehicleColor({ ...base, source: 'live-gps', status: 'offline' })).toBe('#9ca3af');
  });

  it('colours a recorded-activity vehicle amber, distinct from live states', () => {
    const amber = vehicleColor({ ...base, source: 'recorded-activity', status: null });
    expect(amber).toBe('#d97706');
    expect(amber).not.toBe(vehicleColor({ ...base, source: 'live-gps', status: 'online' }));
    expect(amber).not.toBe(vehicleColor({ ...base, source: 'live-gps', status: 'offline' }));
  });
});
