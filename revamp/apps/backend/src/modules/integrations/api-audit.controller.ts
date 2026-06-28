import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../common/types/api-response';

import { type ApiAuditLogDto, ApiAuditService } from './api-audit.service';
import { ListApiAuditLogsQueryDto } from './dto/list-api-audit-logs.query.dto';

/**
 * Read-only viewer for the integration API audit trail (Phase 4, §9.3). Guarded
 * by `service-account:read` — the same admins who manage the keys review the
 * calls. A normal authenticated route (global guards apply).
 */
@ApiTags('service-accounts')
@Controller('admin/api-audit-logs')
export class ApiAuditController {
  constructor(private readonly audit: ApiAuditService) {}

  @Get()
  @RequirePermissions('service-account:read')
  @ApiOperation({ summary: 'List integration API audit logs (paginated, filterable)' })
  list(
    @Query() query: ListApiAuditLogsQueryDto,
  ): Promise<{ data: ApiAuditLogDto[]; meta: PaginationMeta }> {
    return this.audit.list({
      page: query.page,
      limit: query.limit,
      endpoint: query.endpoint,
      statusCode: query.statusCode,
      principalId: query.principalId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
