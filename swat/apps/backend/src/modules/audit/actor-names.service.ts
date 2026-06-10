import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Minimal shape of a row carrying audit actor foreign keys. */
export interface AuditableRow {
  readonly createdById: string | null;
  readonly updatedById: string | null;
}

/** The created-by / updated-by usernames attached to a list DTO. */
export interface ActorNames {
  readonly createdByName: string | null;
  readonly updatedByName: string | null;
}

/**
 * Resolves audit actor ids (`createdById`/`updatedById`) to usernames in a
 * single batched query, so list responses can surface "Dibuat oleh / Diubah
 * oleh" without an N+1. Unknown ids (e.g. deleted users, system writes) resolve
 * to `null`.
 */
@Injectable()
export class ActorNamesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Batch-resolve a set of user ids → `id`→`username` map. */
  async resolve(ids: readonly string[]): Promise<Map<string, string>> {
    const distinct = [...new Set(ids)];
    if (distinct.length === 0) {
      return new Map();
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: distinct } },
      select: { id: true, username: true },
    });
    return new Map(users.map((u) => [u.id, u.username]));
  }

  /**
   * Attach `createdByName`/`updatedByName` to each DTO, paired positionally with
   * its source row. Returns new objects (inputs are never mutated).
   */
  async attach<R extends AuditableRow, D>(
    rows: readonly R[],
    dtos: readonly D[],
  ): Promise<(D & ActorNames)[]> {
    const ids = rows.flatMap((r) => [r.createdById, r.updatedById].filter((v): v is string => !!v));
    const names = await this.resolve(ids);
    return dtos.map((dto, i) => {
      const row = rows[i];
      return {
        ...dto,
        createdByName: row?.createdById ? (names.get(row.createdById) ?? null) : null,
        updatedByName: row?.updatedById ? (names.get(row.updatedById) ?? null) : null,
      };
    });
  }
}
