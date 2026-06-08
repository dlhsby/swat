import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type CreateUserDto } from './dto/create-user.dto';
import { type UsersRepository, type UserWithRole } from './users.repository';
import { UsersService } from './users.service';

jest.mock('../../common/auth/password', () => ({
  generateTempPassword: jest.fn(() => 'Aa1!generatedxx'),
  hashPassword: jest.fn(() => Promise.resolve('$argon2id$hash')),
}));

function buildUser(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return {
    id: 1,
    legacyId: null,
    username: 'opr',
    name: 'Operator',
    roleId: 4,
    passwordHash: '$argon2id$hash',
    mustChangePassword: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    deletedAt: null,
    role: {
      id: 4,
      legacyId: null,
      name: 'Operator Pool',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  } as UserWithRole;
}

describe('UsersService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByUsername: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    roleExists: jest.Mock;
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      roleExists: jest.fn(),
    };
    service = new UsersService(repo as unknown as UsersRepository);
  });

  it('lists users with pagination meta and no password hash', async () => {
    repo.list.mockResolvedValue({ rows: [buildUser()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).not.toHaveProperty('passwordHash');
    expect(result.data[0]?.roleName).toBe('Operator Pool');
  });

  it('returns a single user or 404', async () => {
    repo.findById.mockResolvedValueOnce(buildUser());
    await expect(service.getById(1)).resolves.toMatchObject({ id: 1 });
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById(2)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('create', () => {
    const dto: CreateUserDto = { username: 'newopr', name: 'New', roleId: 4 };

    it('rejects an unknown role', async () => {
      repo.roleExists.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate username', async () => {
      repo.roleExists.mockResolvedValue({ id: 4 });
      repo.findByUsername.mockResolvedValue(buildUser());
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates and returns the temporary password', async () => {
      repo.roleExists.mockResolvedValue({ id: 4 });
      repo.findByUsername.mockResolvedValue(null);
      repo.create.mockResolvedValue(buildUser({ username: 'newopr' }));

      const result = await service.create(dto);
      expect(result.temporaryPassword).toBe('Aa1!generatedxx');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newopr', passwordHash: '$argon2id$hash' }),
      );
    });
  });

  describe('update', () => {
    it('404s on a missing user', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(1, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown role', async () => {
      repo.findById.mockResolvedValue(buildUser());
      repo.roleExists.mockResolvedValue(null);
      await expect(service.update(1, { roleId: 99 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates name and role', async () => {
      repo.findById.mockResolvedValue(buildUser());
      repo.roleExists.mockResolvedValue({ id: 5 });
      repo.update.mockResolvedValue(buildUser({ name: 'Renamed' }));
      const result = await service.update(1, { name: 'Renamed', roleId: 5 });
      expect(result.name).toBe('Renamed');
    });
  });

  describe('remove', () => {
    it('404s on a missing user', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('soft-deletes an existing user', async () => {
      repo.findById.mockResolvedValue(buildUser());
      repo.softDelete.mockResolvedValue(buildUser());
      await expect(service.remove(1)).resolves.toEqual({ message: 'Pengguna telah dihapus.' });
      expect(repo.softDelete).toHaveBeenCalledWith(1);
    });
  });
});
