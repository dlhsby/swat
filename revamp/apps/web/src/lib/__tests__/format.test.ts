import { describe, expect, it } from 'vitest';

import {
  formatDateDisplay,
  formatDateForm,
  formatDistance,
  formatFuel,
  formatRupiah,
  formatTime,
  formatTonnage,
  formatWeight,
} from '../format';
import { getStatusPill, PILL_VARIANT_CLASSES, type PillDomain } from '../status-pill';

describe('format — currency & numbers (id-ID)', () => {
  it('formats rupiah as integer with dot separators', () => {
    expect(formatRupiah(8500000)).toBe('Rp 8.500.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(1234.6)).toBe('Rp 1.235'); // rounds, no decimals
  });

  it('formats weight and distance as integers with unit', () => {
    expect(formatWeight(4250)).toBe('4.250 kg');
    expect(formatDistance(128430)).toBe('128.430 km');
  });

  it('formats fuel with two decimals and comma separator', () => {
    expect(formatFuel(45.5)).toBe('45,50 L');
    expect(formatFuel(8)).toBe('8,00 L');
  });

  it('formats tonnage with up to two decimals', () => {
    expect(formatTonnage(12.75)).toBe('12,75 ton');
    expect(formatTonnage(10)).toBe('10 ton');
  });
});

describe('format — dates & time (WIB)', () => {
  const date = new Date(Date.UTC(2026, 2, 15)); // 15 Mar 2026

  it('formats a form date as dd/MM/yyyy', () => {
    expect(formatDateForm(date)).toBe('15/03/2026');
    expect(formatDateForm('2026-03-05')).toBe('05/03/2026');
  });

  it('formats a display date as d MMM yyyy with Indonesian months', () => {
    expect(formatDateDisplay(date)).toBe('15 Mar 2026');
    expect(formatDateDisplay(new Date(Date.UTC(2026, 4, 1)))).toBe('1 Mei 2026');
    expect(formatDateDisplay(new Date(Date.UTC(2026, 11, 31)))).toBe('31 Des 2026');
  });

  it('formats time as HH:mm:ss in WIB (UTC+7)', () => {
    // 01:30 UTC -> 08:30 WIB
    expect(formatTime(new Date(Date.UTC(2026, 2, 15, 1, 30, 0)))).toBe('08:30:00');
  });
});

describe('status-pill map', () => {
  it('resolves known statuses to the correct label + variant', () => {
    expect(getStatusPill('trip', 'VERIFIED')).toEqual({ label: 'Terverifikasi', variant: 'green' });
    expect(getStatusPill('vehicle', 'MAJOR_DAMAGE')).toEqual({
      label: 'Rusak Berat',
      variant: 'red',
    });
    expect(getStatusPill('employment', 'HONORER')).toEqual({ label: 'Honorer', variant: 'slate' });
    expect(getStatusPill('maintenanceType', 'SERVICE')).toEqual({
      label: 'Servis',
      variant: 'blue',
    });
  });

  it('falls back to a slate pill with the raw value when unknown', () => {
    expect(getStatusPill('trip', 'NOPE')).toEqual({ label: 'NOPE', variant: 'slate' });
  });

  it('every variant has badge + dot classes', () => {
    for (const variant of Object.values(PILL_VARIANT_CLASSES)) {
      expect(variant.badge).toMatch(/^bg-/);
      expect(variant.dot).toMatch(/^bg-/);
    }
  });

  it('covers every documented domain', () => {
    const domains: PillDomain[] = [
      'trip',
      'day',
      'disposalPermit',
      'vehicle',
      'maintenance',
      'maintenanceType',
      'inspection',
      'employment',
      'license',
      'refuel',
      'report',
      'user',
    ];
    for (const domain of domains) {
      // Each domain has at least one entry; spot-check the fallback path is typed.
      expect(typeof getStatusPill(domain, '__missing__').label).toBe('string');
    }
  });
});
