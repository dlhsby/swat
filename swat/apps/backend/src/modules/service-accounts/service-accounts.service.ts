import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { apiKeyPrefix, generateApiKey } from '../../common/auth/api-key';
import { hashPassword, verifyPassword } from '../../common/auth/password';
import { paginated } from '../../common/pagination';
import { type PaginationMeta } from '../../common/types/api-response';
import { type AuditActor, AuditService } from '../audit/audit.service';

import { type CreateServiceAccountDto } from './dto/create-service-account.dto';
import { type ListServiceAccountsQueryDto } from './dto/list-service-accounts.query.dto';
import { type UpdateServiceAccountDto } from './dto/update-service-account.dto';
import {
  ServiceAccountsRepository,
  type ServiceAccountWithRole,
} from './service-accounts.repository';
import { type CreatedServiceAccountDto, type ServiceAccountDto } from './service-accounts.types';

function toDto(account: ServiceAccountWithRole): ServiceAccountDto {
  return {
    id: account.id,
    name: account.name,
    apiKeyPrefix: account.apiKeyPrefix,
    roleId: account.roleId,
    roleName: account.role.name,
    active: account.active,
    rateLimitPerMin: account.rateLimitPerMin,
    allowedIPs: account.allowedIPs,
    lastUsedAt: account.lastUsedAt?.toISOString() ?? null,
    revokedAt: account.revokedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

@Injectable()
export class ServiceAccountsService {
  private readonly logger = new Logger(ServiceAccountsService.name);

  constructor(
    private readonly repo: ServiceAccountsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: ListServiceAccountsQueryDto,
  ): Promise<{ data: ServiceAccountDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      active: query.active,
      search: query.search,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<ServiceAccountDto> {
    return toDto(await this.requireAccount(id));
  }

  async create(dto: CreateServiceAccountDto, actor: AuditActor): Promise<CreatedServiceAccountDto> {
    const role = await this.repo.roleExists(dto.roleId);
    if (!role) {
      throw new BadRequestException('Peran tidak ditemukan.');
    }
    const { key, prefix } = generateApiKey();
    const apiKeyHash = await hashPassword(key);
    const account = await this.repo.create({
      name: dto.name,
      apiKeyHash,
      apiKeyPrefix: prefix,
      roleId: dto.roleId,
      rateLimitPerMin: dto.rateLimitPerMin ?? 500,
      allowedIPs: dto.allowedIPs ?? [],
      createdById: actor.id ?? null,
      updatedById: actor.id ?? null,
    });
    await this.audit.record({
      actor,
      action: 'service-account.create',
      entityType: 'ServiceAccount',
      entityId: account.id,
      details: `Membuat akun layanan ${account.name}`,
    });
    // The plaintext key is returned ONCE here and never stored or logged.
    return { ...toDto(account), apiKey: key };
  }

  async update(
    id: string,
    dto: UpdateServiceAccountDto,
    actor: AuditActor,
  ): Promise<ServiceAccountDto> {
    await this.requireAccount(id);
    if (dto.roleId !== undefined) {
      const role = await this.repo.roleExists(dto.roleId);
      if (!role) {
        throw new BadRequestException('Peran tidak ditemukan.');
      }
    }
    const updated = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.roleId !== undefined ? { roleId: dto.roleId } : {}),
      ...(dto.rateLimitPerMin !== undefined ? { rateLimitPerMin: dto.rateLimitPerMin } : {}),
      ...(dto.allowedIPs !== undefined ? { allowedIPs: dto.allowedIPs } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      updatedById: actor.id ?? null,
    });
    await this.audit.record({
      actor,
      action: 'service-account.update',
      entityType: 'ServiceAccount',
      entityId: updated.id,
    });
    return toDto(updated);
  }

  /** Revoke = deactivate + stamp `revokedAt`. The key hash is kept for audit but
   * can never authenticate again (validation requires active && !revokedAt). */
  async revoke(id: string, actor: AuditActor): Promise<{ message: string }> {
    await this.requireAccount(id);
    await this.repo.update(id, {
      active: false,
      revokedAt: new Date(),
      updatedById: actor.id ?? null,
    });
    await this.audit.record({
      actor,
      action: 'service-account.revoke',
      entityType: 'ServiceAccount',
      entityId: id,
    });
    return { message: 'Akun layanan telah dicabut.' };
  }

  /**
   * Authenticate a presented API key. Looks up active candidates by the key's
   * prefix (indexed), then verifies the Argon2 hash in constant time. Returns the
   * account (with role) or null. Best-effort `lastUsedAt` stamp; failures there
   * never reject the request. Called by the weighbridge guard — never exposed.
   */
  async validateApiKey(key: string): Promise<ServiceAccountWithRole | null> {
    if (!key) {
      return null;
    }
    const candidates = await this.repo.findActiveByPrefix(apiKeyPrefix(key));
    for (const candidate of candidates) {
      if (await verifyPassword(candidate.apiKeyHash, key)) {
        this.repo.touchLastUsed(candidate.id, new Date()).catch((error) => {
          this.logger.warn(`Failed to stamp lastUsedAt for service account ${candidate.id}`, error);
        });
        return candidate;
      }
    }
    return null;
  }

  private async requireAccount(id: string): Promise<ServiceAccountWithRole> {
    const account = await this.repo.findById(id);
    if (!account) {
      throw new NotFoundException('Akun layanan tidak ditemukan.');
    }
    return account;
  }
}
