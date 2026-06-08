import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../modules/prisma/prisma.service';

export interface ReadinessStatus {
  readonly status: 'ready';
  readonly checks: { readonly database: 'up' };
}

/**
 * Readiness logic, separate from the controller so the DB-dependency check is
 * unit-testable. `/ready` differs from `/health`: liveness says the process is
 * up; readiness says it can actually serve traffic (DB reachable).
 */
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkReadiness(): Promise<ReadinessStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Basis data tidak dapat dijangkau.');
    }
    return { status: 'ready', checks: { database: 'up' } };
  }
}
