import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly timestamp: string;
}

/**
 * Liveness endpoint. Always returns `ok` when the process is serving traffic;
 * it performs no dependency checks (readiness/DB checks arrive in Phase 1).
 * Unguarded by design so orchestrators can probe it without credentials.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'swat-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
