import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/**
 * SI ↔ SWAT name translation for the Excel weighing import (Phase 4, parity G14).
 * Loads the `konversi_si_swat` mappings (scoped by category) plus the generic
 * `legacy_name_map` into in-memory maps for a single import run. Lookups are
 * case-insensitive and fall back to the original value when no mapping exists.
 */
@Injectable()
export class ConversionService {
  constructor(private readonly prisma: PrismaService) {}

  async load(category: string): Promise<NameTranslator> {
    const [konversi, legacy] = await this.prisma.$transaction([
      this.prisma.konversiSiSwat.findMany({
        where: { category },
        select: { si: true, swat: true },
      }),
      this.prisma.legacyNameMap.findMany({ select: { si: true, swat: true } }),
    ]);
    const map = new Map<string, string>();
    for (const row of legacy) {
      if (row.si && row.swat) {
        map.set(normalize(row.si), row.swat);
      }
    }
    // konversi_si_swat takes precedence over the generic legacy map.
    for (const row of konversi) {
      map.set(normalize(row.si), row.swat);
    }
    return new NameTranslator(map);
  }
}

/** Immutable translator built from the loaded mappings. */
export class NameTranslator {
  constructor(private readonly map: ReadonlyMap<string, string>) {}

  translate(value: string): string {
    return this.map.get(normalize(value)) ?? value;
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
