import { Injectable } from '@nestjs/common';
import { type Permission, type Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const roleInclude = {
  permissions: { select: { permissionId: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

export type RoleWithRelations = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<RoleWithRelations[]> {
    return this.prisma.role.findMany({ include: roleInclude, orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<RoleWithRelations | null> {
    return this.prisma.role.findUnique({ where: { id }, include: roleInclude });
  }

  findByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.role.findUnique({ where: { name }, select: { id: true } });
  }

  permissionsByIds(ids: string[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({ where: { id: { in: ids } } });
  }

  permissionsForRole(roleId: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { roles: { some: { roleId } } },
      orderBy: { key: 'asc' },
    });
  }

  /** Create the role and its permission grants in one transaction. */
  async create(name: string, permissionIds: string[]): Promise<RoleWithRelations> {
    return this.prisma.role.create({
      data: {
        name,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
      include: roleInclude,
    });
  }

  /** Replace name and/or the full permission set atomically. */
  async update(
    id: string,
    data: { name?: string; permissionIds?: string[] },
  ): Promise<RoleWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (data.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          skipDuplicates: true,
        });
      }
      return tx.role.update({
        where: { id },
        data: { ...(data.name !== undefined ? { name: data.name } : {}) },
        include: roleInclude,
      });
    });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.role.delete({ where: { id }, select: { id: true } });
  }
}
