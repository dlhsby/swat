import { Injectable, Logger } from '@nestjs/common';
import { type ApiPrincipalType, type Prisma } from '@prisma/client';
import { type Request } from 'express';

import { paginated } from '../../common/pagination';
import { type PaginationMeta } from '../../common/types/api-response';
import { PrismaService } from '../prisma/prisma.service';

import { type ApiPrincipal } from './types/principal';

export interface ApiAuditLogFilter {
  readonly page: number;
  readonly limit: number;
  readonly endpoint?: string;
  readonly statusCode?: number;
  readonly principalId?: string;
  readonly from?: Date;
  readonly to?: Date;
}

export interface ApiAuditLogDto {
  readonly id: string;
  readonly principalType: string;
  readonly principalId: string | null;
  readonly principalName: string;
  readonly method: string;
  readonly endpoint: string;
  readonly statusCode: number;
  readonly requestSummary: string | null;
  readonly responseSummary: string | null;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly timestamp: string;
}

export interface ApiAuditEntry {
  readonly principal: ApiPrincipal;
  readonly method: string;
  readonly endpoint: string;
  readonly statusCode: number;
  readonly requestSummary?: string | null;
  readonly responseSummary?: string | null;
  readonly ipAddress: string;
  readonly userAgent: string;
}

interface ApiAuditRow {
  readonly principalType: ApiPrincipalType;
  readonly principalId: string | null;
  readonly principalName: string;
  readonly method: string;
  readonly endpoint: string;
  readonly statusCode: number;
  readonly requestSummary: string | null;
  readonly responseSummary: string | null;
  readonly ipAddress: string;
  readonly userAgent: string;
}

const MAX_SUMMARY = 512;

/**
 * Append-only audit trail for integration API calls (Phase 4, T-412). One row per
 * weighbridge call — successes via {@link log} (from the audit interceptor) and
 * rejected calls (401/403/429) via {@link logRejection} (from the guard, since a
 * guard rejection short-circuits before interceptors run). Summaries are
 * truncated and must NEVER contain secrets (API keys, passwords) or large bodies.
 * Writing the audit row must never break the request, so failures are logged and
 * swallowed — mirrors {@link AuditService}.
 */
@Injectable()
export class ApiAuditService {
  private readonly logger = new Logger(ApiAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ApiAuditLogFilter): Promise<{ data: ApiAuditLogDto[]; meta: PaginationMeta }> {
    const where: Prisma.ApiAuditLogWhereInput = {
      ...(filter.endpoint ? { endpoint: { contains: filter.endpoint, mode: 'insensitive' } } : {}),
      ...(filter.statusCode ? { statusCode: filter.statusCode } : {}),
      ...(filter.principalId ? { principalId: filter.principalId } : {}),
      ...(filter.from || filter.to
        ? {
            timestamp: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };
    const skip = (filter.page - 1) * filter.limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.apiAuditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: filter.limit,
      }),
      this.prisma.apiAuditLog.count({ where }),
    ]);
    const data = rows.map((row) => ({
      id: row.id,
      principalType: row.principalType,
      principalId: row.principalId,
      principalName: row.principalName,
      method: row.method,
      endpoint: row.endpoint,
      statusCode: row.statusCode,
      requestSummary: row.requestSummary,
      responseSummary: row.responseSummary,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      timestamp: row.timestamp.toISOString(),
    }));
    return paginated(data, total, filter);
  }

  /** Record a successful (authenticated) call. */
  async log(entry: ApiAuditEntry): Promise<void> {
    await this.persist({
      principalType: entry.principal.type as ApiPrincipalType,
      principalId: entry.principal.id,
      principalName: entry.principal.name,
      method: entry.method,
      endpoint: entry.endpoint,
      statusCode: entry.statusCode,
      requestSummary: truncate(entry.requestSummary),
      responseSummary: truncate(entry.responseSummary),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent.slice(0, MAX_SUMMARY),
    });
  }

  /**
   * Record a REJECTED call (invalid credential, IP not allowed, missing
   * permission, rate limited). Captures the resolved principal when one exists
   * (e.g. a 429 after auth), else the attempted credential type — so brute-force
   * and IP-spoof attempts leave an auditable trail.
   */
  async logRejection(request: Request, statusCode: number): Promise<void> {
    const principal = request.principal;
    await this.persist({
      principalType: principal?.type ?? attemptedPrincipalType(request),
      principalId: principal?.id ?? null,
      principalName: principal?.name ?? 'unauthenticated',
      method: request.method,
      endpoint: endpointOf(request),
      statusCode,
      requestSummary: truncate(summarizeRequest(request)),
      responseSummary: null,
      ipAddress: ipOf(request),
      userAgent: (request.headers['user-agent'] ?? '').slice(0, MAX_SUMMARY),
    });
  }

  private async persist(row: ApiAuditRow): Promise<void> {
    try {
      await this.prisma.apiAuditLog.create({ data: row });
    } catch (error) {
      this.logger.warn(`Failed to write API audit log for ${row.method} ${row.endpoint}`, error);
    }
  }
}

function truncate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.length > MAX_SUMMARY ? value.slice(0, MAX_SUMMARY) : value;
}

/** Coarse, secret-free summary: plate + date + code when present (never the body). */
export function summarizeRequest(request: Request): string | null {
  const body = request.body as Record<string, unknown> | undefined;
  if (!body) {
    return null;
  }
  const parts: string[] = [];
  if (typeof body.plateNumber === 'string') {
    parts.push(`plate=${body.plateNumber}`);
  }
  if (typeof body.date === 'string') {
    parts.push(`date=${body.date}`);
  }
  if (typeof body.code === 'string') {
    parts.push(`code=${body.code}`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

export function endpointOf(request: Request): string {
  const url = request.originalUrl ?? request.url ?? request.path ?? '';
  return url.split('?')[0] ?? url;
}

export function ipOf(request: Request): string {
  return request.ip ?? request.socket?.remoteAddress ?? '';
}

/** Best guess at the credential type a rejected caller attempted. */
function attemptedPrincipalType(request: Request): ApiPrincipalType {
  const hasApiKey =
    typeof request.headers['x-api-key'] === 'string' ||
    request.headers.authorization?.startsWith('Bearer swatwb_') === true;
  return hasApiKey ? 'SERVICE_ACCOUNT' : 'USER';
}
