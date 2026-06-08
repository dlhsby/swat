import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { generateTempPassword, hashPassword } from '../../common/auth/password';
import { paginated } from '../../common/pagination';
import { type PaginationMeta } from '../../common/types/api-response';
import { type AuditActor, AuditService } from '../audit/audit.service';

import { type CreateUserDto } from './dto/create-user.dto';
import { type ListUsersQueryDto } from './dto/list-users.query.dto';
import { type UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository, type UserWithRole } from './users.repository';
import { type CreatedUserDto, type UserDto } from './users.types';

function toUserDto(user: UserWithRole): UserDto {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role.name,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<{ data: UserDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      roleId: query.roleId,
      search: query.search,
    });
    return paginated(rows.map(toUserDto), total, query);
  }

  async getById(id: number): Promise<UserDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    return toUserDto(user);
  }

  async create(dto: CreateUserDto, actor: AuditActor): Promise<CreatedUserDto> {
    const role = await this.repo.roleExists(dto.roleId);
    if (!role) {
      throw new BadRequestException('Peran tidak ditemukan.');
    }
    const existing = await this.repo.findByUsername(dto.username);
    if (existing) {
      throw new ConflictException('Nama pengguna sudah digunakan.');
    }

    const temporaryPassword = generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const user = await this.repo.create({
      username: dto.username,
      name: dto.name,
      roleId: dto.roleId,
      passwordHash,
    });
    await this.audit.record({
      actor,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      details: `Membuat pengguna ${user.username} (peran #${user.roleId})`,
    });
    return { ...toUserDto(user), temporaryPassword };
  }

  async update(id: number, dto: UpdateUserDto, actor: AuditActor): Promise<UserDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    if (dto.roleId !== undefined) {
      const role = await this.repo.roleExists(dto.roleId);
      if (!role) {
        throw new BadRequestException('Peran tidak ditemukan.');
      }
    }

    const updated = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.roleId !== undefined ? { role: { connect: { id: dto.roleId } } } : {}),
    });
    await this.audit.record({
      actor,
      action: 'user.update',
      entityType: 'User',
      entityId: updated.id,
    });
    return toUserDto(updated);
  }

  async remove(id: number, actor: AuditActor): Promise<{ message: string }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      actor,
      action: 'user.delete',
      entityType: 'User',
      entityId: id,
    });
    return { message: 'Pengguna telah dihapus.' };
  }
}
