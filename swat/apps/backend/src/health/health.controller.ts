import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';

import { type ReadinessStatus, HealthService } from './health.service';

interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly timestamp: string;
}

/**
 * Liveness + readiness endpoints. `/health` always returns `ok` while the
 * process serves traffic (no dependency checks) so orchestrators can probe it
 * without credentials; `/ready` additionally verifies the database is
 * reachable and 503s when it is not. Both are unguarded by design.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness check' })
  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'swat-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check (verifies database connectivity)' })
  ready(): Promise<ReadinessStatus> {
    return this.health.checkReadiness();
  }
}
