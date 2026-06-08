import { Injectable } from '@nestjs/common';
import { type Prisma, type Role, type User } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export type UserWithRole = User & { role: Role };

export interface ListUsersFilter extends PageParams {
  readonly roleId?: number;
  readonly search?: string;
}

/** Prisma access for users. Soft-deleted rows are excluded from listings/reads. */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListUsersFilter): Prisma.UserWhereInput {
    return {
      deletedAt: null,
      ...(filter.roleId ? { roleId: filter.roleId } : {}),
      ...(filter.search
        ? {
            OR: [
              { username: { contains: filter.search, mode: 'insensitive' } },
              { name: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(filter: ListUsersFilter): Promise<{ rows: UserWithRole[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { username: 'asc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number): Promise<UserWithRole | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } });
  }

  /** Username uniqueness spans all rows (including soft-deleted) per the DB constraint. */
  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  create(data: {
    username: string;
    name: string;
    roleId: number;
    passwordHash: string;
  }): Promise<UserWithRole> {
    return this.prisma.user.create({
      data: { ...data, mustChangePassword: true },
      include: { role: true },
    });
  }

  update(id: number, data: Prisma.UserUpdateInput): Promise<UserWithRole> {
    return this.prisma.user.update({ where: { id }, data, include: { role: true } });
  }

  softDelete(id: number): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  roleExists(roleId: number): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { id: roleId } });
  }
}
