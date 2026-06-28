import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type AuditActor, type AuditService } from '../audit/audit.service';

import {
  type ServiceAccountsRepository,
  type ServiceAccountWithRole,
} from './service-accounts.repository';
import { ServiceAccountsService } from './service-accounts.service';

const actor: AuditActor = { id: '00000000-0000-0000-0000-0000000000a1', username: 'admin' };

jest.mock('../../common/auth/api-key', () => ({
  generateApiKey: jest.fn(() => ({ key: 'swatwb_deadbeefkey', prefix: 'swatwb_deadb' })),
  apiKeyPrefix: jest.fn((key: string) => key.slice(0, 12)),
}));

jest.mock('../../common/auth/password', () => ({
  hashPassword: jest.fn(() => Promise.resolve('$argon2id$hash')),
  verifyPassword: jest.fn((_stored: string, plain: string) =>
    Promise.resolve(plain === 'swatwb_correctkey'),
  ),
}));

function buildAccount(overrides: Partial<ServiceAccountWithRole> = {}): ServiceAccountWithRole {
  return {
    id: '00000000-0000-0000-0000-0000000000c1',
    legacyId: null,
    name: 'TPA Timbang',
    apiKeyHash: '$argon2id$hash',
    apiKeyPrefix: 'swatwb_deadb',
    roleId: '00000000-0000-0000-0000-0000000000b4',
    active: true,
    rateLimitPerMin: 500,
    allowedIPs: [],
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    createdById: null,
    updatedById: null,
    role: {
      id: '00000000-0000-0000-0000-0000000000b4',
      legacyId: null,
      name: 'Integrasi Timbang',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: null,
      updatedById: null,
      deletedById: null,
    },
    ...overrides,
  } as ServiceAccountWithRole;
}

describe('ServiceAccountsService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findActiveByPrefix: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    touchLastUsed: jest.Mock;
    roleExists: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: ServiceAccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findActiveByPrefix: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
      roleExists: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ServiceAccountsService(
      repo as unknown as ServiceAccountsRepository,
      audit as unknown as AuditService,
    );
  });

  it('lists accounts without the key hash', async () => {
    repo.list.mockResolvedValue({ rows: [buildAccount()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).not.toHaveProperty('apiKeyHash');
    expect(result.data[0]?.apiKeyPrefix).toBe('swatwb_deadb');
  });

  describe('create', () => {
    const dto = { name: 'TPA Timbang', roleId: '00000000-0000-0000-0000-0000000000b4' };

    it('rejects an unknown role', async () => {
      repo.roleExists.mockResolvedValue(null);
      await expect(service.create(dto, actor)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates and returns the plaintext key ONCE', async () => {
      repo.roleExists.mockResolvedValue({ id: dto.roleId });
      repo.create.mockResolvedValue(buildAccount());
      const result = await service.create(dto, actor);
      expect(result.apiKey).toBe('swatwb_deadbeefkey');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ apiKeyHash: '$argon2id$hash', apiKeyPrefix: 'swatwb_deadb' }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'service-account.create' }),
      );
    });
  });

  describe('revoke', () => {
    it('404s on a missing account', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.revoke('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deactivates and stamps revokedAt', async () => {
      repo.findById.mockResolvedValue(buildAccount());
      repo.update.mockResolvedValue(buildAccount({ active: false, revokedAt: new Date() }));
      await expect(service.revoke('00000000-0000-0000-0000-0000000000c1', actor)).resolves.toEqual({
        message: 'Akun layanan telah dicabut.',
      });
      expect(repo.update).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-0000000000c1',
        expect.objectContaining({ active: false, revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('validateApiKey', () => {
    it('returns null for an empty key', async () => {
      await expect(service.validateApiKey('')).resolves.toBeNull();
      expect(repo.findActiveByPrefix).not.toHaveBeenCalled();
    });

    it('returns null when no candidate hash matches', async () => {
      repo.findActiveByPrefix.mockResolvedValue([buildAccount()]);
      await expect(service.validateApiKey('swatwb_wrongkey')).resolves.toBeNull();
    });

    it('returns the account and stamps lastUsedAt on a match', async () => {
      const account = buildAccount();
      repo.findActiveByPrefix.mockResolvedValue([account]);
      await expect(service.validateApiKey('swatwb_correctkey')).resolves.toBe(account);
      expect(repo.touchLastUsed).toHaveBeenCalledWith(account.id, expect.any(Date));
    });
  });
});
