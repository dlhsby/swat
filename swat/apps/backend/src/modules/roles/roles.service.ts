import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RolePermissionsService } from '../../common/auth/role-permissions.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository, type RoleWithRelations } from './roles.repository';
import { type RoleDetailDto, type RoleDto } from './roles.types';

function toRoleDto(role: RoleWithRelations): RoleDto {
  return {
    id: role.id,
    name: role.name,
    permissionIds: role.permissions.map((rp) => rp.permissionId),
    userCount: role._count.users,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

@Injectable()
export class RolesService {
  constructor(
    private readonly repo: RolesRepository,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async list(): Promise<RoleDto[]> {
    const roles = await this.repo.list();
    return roles.map(toRoleDto);
  }

  async getById(id: number): Promise<RoleDetailDto> {
    const role = await this.repo.findById(id);
    if (!role) {
      throw new NotFoundException('Peran tidak ditemukan.');
    }
    const permissions = await this.repo.permissionsForRole(id);
    return {
      ...toRoleDto(role),
      permissions: permissions.map((p) => ({ id: p.id, key: p.key, description: p.description })),
    };
  }

  async create(dto: CreateRoleDto): Promise<RoleDto> {
    const nameTaken = await this.repo.findByName(dto.name);
    if (nameTaken) {
      throw new ConflictException('Nama peran sudah digunakan.');
    }
    await this.assertPermissionsExist(dto.permissionIds);

    const role = await this.repo.create(dto.name, dto.permissionIds);
    return toRoleDto(role);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Peran tidak ditemukan.');
    }
    if (dto.name && dto.name !== existing.name) {
      const nameTaken = await this.repo.findByName(dto.name);
      if (nameTaken) {
        throw new ConflictException('Nama peran sudah digunakan.');
      }
    }
    if (dto.permissionIds) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    const role = await this.repo.update(id, { name: dto.name, permissionIds: dto.permissionIds });
    // Only the grants affect authz — skip cache invalidation on a name-only edit.
    if (dto.permissionIds) {
      await this.rolePermissions.invalidate(id);
    }
    return toRoleDto(role);
  }

  async remove(id: number): Promise<{ message: string }> {
    const role = await this.repo.findById(id);
    if (!role) {
      throw new NotFoundException('Peran tidak ditemukan.');
    }
    if (role._count.users > 0) {
      throw new ConflictException(
        `Tidak dapat menghapus: peran masih dipakai oleh ${role._count.users} pengguna.`,
      );
    }
    await this.repo.delete(id);
    await this.rolePermissions.invalidate(id);
    return { message: 'Peran telah dihapus.' };
  }

  private async assertPermissionsExist(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const found = await this.repo.permissionsByIds(ids);
    if (found.length !== ids.length) {
      throw new BadRequestException('Sebagian izin tidak ditemukan.');
    }
  }
}
