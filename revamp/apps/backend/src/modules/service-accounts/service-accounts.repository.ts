import { Injectable } from '@nestjs/common';
import { type Prisma, type Role, type ServiceAccount } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export type ServiceAccountWithRole = ServiceAccount & { role: Role };

export interface ListServiceAccountsFilter extends PageParams {
  readonly active?: boolean;
  readonly search?: string;
}

/**
 * Prisma access for service accounts. The full API key is never stored — only its
 * Argon2 hash (`apiKeyHash`) and an identifying `apiKeyPrefix`. Lookups for
 * authentication go through {@link findActiveByPrefix}; the caller then verifies
 * the hash.
 */
@Injectable()
export class ServiceAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListServiceAccountsFilter): Prisma.ServiceAccountWhereInput {
    return {
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.search ? { name: { contains: filter.search, mode: 'insensitive' } } : {}),
    };
  }

  async list(
    filter: ListServiceAccountsFilter,
  ): Promise<{ rows: ServiceAccountWithRole[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.serviceAccount.findMany({
        where,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.serviceAccount.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<ServiceAccountWithRole | null> {
    return this.prisma.serviceAccount.findUnique({ where: { id }, include: { role: true } });
  }

  /** Active, non-revoked candidates sharing an API-key prefix — usually one. The
   * caller verifies the Argon2 hash to confirm the exact key. */
  findActiveByPrefix(prefix: string): Promise<ServiceAccountWithRole[]> {
    return this.prisma.serviceAccount.findMany({
      where: { apiKeyPrefix: prefix, active: true, revokedAt: null },
      include: { role: true },
    });
  }

  create(data: Prisma.ServiceAccountUncheckedCreateInput): Promise<ServiceAccountWithRole> {
    return this.prisma.serviceAccount.create({ data, include: { role: true } });
  }

  update(
    id: string,
    data: Prisma.ServiceAccountUncheckedUpdateInput,
  ): Promise<ServiceAccountWithRole> {
    return this.prisma.serviceAccount.update({ where: { id }, data, include: { role: true } });
  }

  /** Best-effort `lastUsedAt` stamp — never on the request's critical path. */
  async touchLastUsed(id: string, when: Date): Promise<void> {
    await this.prisma.serviceAccount.update({ where: { id }, data: { lastUsedAt: when } });
  }

  roleExists(roleId: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { id: roleId } });
  }
}
